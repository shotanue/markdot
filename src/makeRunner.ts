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
      if (task.kind !== "codeblock") {
        throw new Error("invalid kind given");
      }

      if (task.code === "") {
        logger.warn("ignored: empty lines.");
      }
      const { bash, env } = z
        .object({
          bash: z.object({
            insertBefore: z.string().optional(),
            insertAfter: z.string().optional(),
          }),
          env: z.record(z.string(), z.string().or(z.array(z.string()))).optional(),
        })
        .parse(preferences);

      const insertBefore = "insertBefore" in bash ? String(bash.insertBefore) : "";
      const insertAfter = "insertAfter" in bash ? String(bash.insertAfter) : "";
      const fetchFileOrElsePassThrough = async (maybePath: string): Promise<string> => {
        if (await exists({ path: maybePath })) {
          return await read({ path: maybePath });
        }
        return maybePath;
      };

      return exec(
        ["bash"],
        [await fetchFileOrElsePassThrough(insertBefore), task.code, await fetchFileOrElsePassThrough(insertAfter)].join(
          "\n",
        ),
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
    execute: async (task, { write }) => {
      if (task.kind !== "codeblock") {
        throw new Error("invalid kind given");
      }
      const path = task.meta["::to"];
      await write({ path, input: task.code });
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
