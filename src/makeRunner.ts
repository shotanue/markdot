import chalkTemplate from "chalk-template";
import { Ctx, Executor, Runner } from ".";

import bashPage from "@resources/langs/bash.md";
import brewfilePage from "@resources/langs/brewfile.md";
import toPage from "@resources/tags/to.md";

type MakeRunner = (args: {
  executors: Executor[];
  ctx: Ctx;
}) => Runner;

export const makeRunner: MakeRunner =
  ({ executors, ctx }) =>
  async (tasks) => {
    for (const task of tasks.list) {
      for (const { execute } of executors.filter((executor) => executor.matcher(task))) {
        if ("ignore" in task.meta) {
          ctx.logger.info(chalkTemplate`[markdot] {bold ${task.fragments.join(",")}} ::ignore`);
          continue;
        } else {
          ctx.logger.info(chalkTemplate`[markdot] {bold ${task.fragments.join(",")}}`);
        }

        const result = execute(task, ctx);
        if (result.error) {
          ctx.logger.error(`fragment: ${task.fragments.join(",")}`);
          ctx.logger.error(`exitCode: ${result.error.exitCode}`);
        }
      }
    }

    return { data: { message: "finished." } };
  };

export const executors = {
  bash: {
    name: "bash",
    kind: "lang",
    doc: bashPage,
    matcher: ({ lang }) => lang.toLowerCase() === "bash",
    execute: ({ code }, { exec, logger }) => {
      if (code === "") {
        logger.warn("ignored: empty lines.");
        return { data: {} };
      }

      return exec(["bash"], code);
    },
  },
  brewfile: {
    name: "brewfile",
    kind: "lang",
    doc: brewfilePage,
    matcher: ({ lang }) => lang.toLowerCase() === "brewfile",
    execute: ({ code, meta }, { exec }) => {
      const brewArgs = meta.args ?? "";
      const command = [...["brew", "bundle"], ...brewArgs.split(" "), "--file=-"].filter((x) => x !== "");
      return exec(command, code);
    },
  },
  "::to": {
    name: "::to",
    kind: "tag",
    doc: toPage,
    matcher: ({ meta }) => "::to" in meta,
    execute: () => {
      return { data: {} };
    },
  },
} satisfies Record<string, Executor>;
