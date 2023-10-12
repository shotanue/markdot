import chalkTemplate from "chalk-template";
import { Ctx, Executor, Transformer } from ".";

type MakeMarkdot = (deps: { ctx: Ctx; transformer: Transformer; executors: Executor[] }) => Markdot;
type Markdot = (markdownText: string, opts: { fragments: string[] }) => Promise<void>;

export const makeMarkdot: MakeMarkdot =
  ({ ctx, transformer, executors }) =>
  async (markdownText, opts) => {
    const { preferences, list } = transformer({ markdownText, fragments: opts.fragments });

    for (const task of list) {
      for (const { execute } of executors.filter((executor) => executor.matcher(task))) {
        ctx.logger.info(chalkTemplate`{bold ${task.breadcrumb}}`);

        await execute(task, ctx, preferences);
      }
    }
  };
