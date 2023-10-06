import bashPage from "@resources/langs/bash.md";
import brewfilePage from "@resources/langs/brewfile.md";
import hyperlinkPage from "@resources/markups/hyperlink.md";
import toPage from "@resources/tags/to.md";
import chalkTemplate from "chalk-template";
import { z } from "zod";
import { Ctx, Executor, Runner } from ".";

type MakeRunner = (args: {
  executors: Executor[];
  ctx: Ctx;
}) => Runner;

export const makeRunner: MakeRunner =
  ({ executors, ctx }) =>
  async (tasks) => {
    for (const task of tasks.list) {
      const breadcrumb = task.fragments.map((x) => `${"#".repeat(x.depth)} ${x.text}`).join(" > ");
      for (const { execute } of executors.filter((executor) => executor.matcher(task))) {
        if (task.kind === "codeblock" && "::ignore" in task.meta) {
          ctx.logger.info(chalkTemplate`{bold ${breadcrumb}} ::ignore`);
          continue;
        } else {
          ctx.logger.info(chalkTemplate`{bold ${breadcrumb}}`);
        }

        await execute(task, ctx, tasks.preferences);
      }
    }
  };

export const executors = [
  {
    name: "bash",
    kind: "lang",
    doc: bashPage,
    matcher: (task) => task.kind === "codeblock" && task.lang.toLowerCase() === "bash",
    execute: async (task, { logger, exec, read, exists }, preferences) => {
      z.object({
        kind: z.literal("codeblock"),
        code: z.string(),
      }).parse(task);

      if (task.kind !== "codeblock") {
        throw new Error("task.kind should be codeblock.");
      }
      if (task.code === "") {
        logger.warn("ignored: empty lines.");
        return;
      }
      if ("::to" in task.meta) {
        logger.info("skipped due to bash codeblock with ::to");
        return;
      }

      const schema = z.object({
        bash: z
          .object({
            insertBefore: z.string().default(""),
            insertAfter: z.string().default(""),
          })
          .default({}),
        env: z.record(z.string(), z.string().or(z.array(z.string()))).default({}),
      });

      const { bash, env } = schema.parse(preferences);

      const fetchFileOrElsePassThrough = async (maybePath: string): Promise<string> => {
        if (await exists({ path: maybePath })) {
          return await read({ path: maybePath });
        }
        return maybePath;
      };

      return exec(
        ["bash"],
        [
          await fetchFileOrElsePassThrough(bash.insertBefore),
          task.code,
          await fetchFileOrElsePassThrough(bash.insertAfter),
        ].join("\n"),
        {
          env,
        },
      );
    },
  },
  {
    name: "brewfile",
    kind: "lang",
    doc: brewfilePage,
    matcher: (task) => task.kind === "codeblock" && task.lang.toLowerCase() === "brewfile",
    execute: (task, { exec }) => {
      if (task.kind !== "codeblock") {
        throw new Error("invalid kind given");
      }

      const brewArgs = task.meta["::args"] ?? "";
      const command = [...["brew", "bundle"], ...brewArgs.split(" "), "--file=-"].filter((x) => x !== "");
      return exec(command, task.code);
    },
  },
  {
    name: "::to",
    kind: "tag",
    doc: toPage,
    matcher: (task) => task.kind === "codeblock" && "::to" in task.meta,
    execute: async (task, { write, logger }) => {
      if (task.kind !== "codeblock") {
        throw new Error("invalid kind given");
      }
      const path = task.meta["::to"];
      logger.info(`Trying to write file. path:${path}`);
      await write({ path, input: task.code });
      logger.success(`Success writing. path:${path}`);
    },
  },
  {
    name: "hyperlink",
    kind: "markup",
    doc: hyperlinkPage,
    matcher: (task) => task.kind === "hyperlink",
    execute: async (task, { symlink, read, write }) => {
      if (task.kind !== "hyperlink") {
        throw new Error("invalid kind given");
      }

      if (task.type === "symlink") {
        await symlink({ src: task.src, referer: task.referer });
      }

      if (task.type === "copy") {
        await write({ path: task.referer, input: await read({ path: task.src }) });
      }
    },
  },
] satisfies Executor[];
