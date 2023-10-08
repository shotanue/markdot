import os from "os";
import Mustache from "mustache";
import remarkBreaks from "remark-breaks";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { executors, makeRunner } from "./makeRunner";
import { makeTaskScheduler } from "./makeTaskScheduler";
import { makeTransformer } from "./makeTransformer";
import { parseArguments } from "./parseArguments";
import { getEnv } from "./getEnv";
import { logger } from "./logger";
import { makeFsAdapter } from "./makeFsAdapter";
import { makeOsAdapter } from "./makeOsAdapter";

type Fragment = {
  depth: number;
  text: string;
};

type Input = {
  markdownText: string; // from: file|stdin
  fragments: string[];
};

export type Task =
  | {
      kind: "codeblock";
      lang: string;
      meta: Record<string, string>;
      code: string;
      fragments: Fragment[];
    }
  | {
      kind: "hyperlink";
      referer: string;
      src: string;
      type: "copy" | "symlink";
      fragments: Fragment[];
    };

type Tasks = {
  preferences: Record<string, unknown>;
  list: Task[];
};

type Log = (message: string, options?: { label: boolean }) => void;
type Logger<T extends Log = Log> = {
  info: T;
  warn: T;
  error: T;
  success: T;
};

export type Ctx = {
  logger: Logger;
  exec: (command: string[], stdin: string, opt?: { env: Record<string, string | string[]> }) => Promise<void>;
  exists: (args: { path: string }) => Promise<boolean>;
  read: (args: { path: string }) => Promise<string>;
  write: (args: { path: string; input: string }) => Promise<void>;
  symlink: (args: { src: string; referer: string }) => Promise<void>;
};
export type Executor = {
  name: string;
  kind: "lang" | "tag" | "markup";
  doc: string;
  matcher: (task: Task) => boolean;
  execute: (task: Task, ctx: Ctx, preferences: Record<string, unknown>) => Promise<void>;
};

/**
parse markdown text
--> transform mdast to markdot model(codeblocks list)
--> filter codeblocks to run
--> pass them to runner
*/
export type ParseArguments = (
  argv: string[],
  executors: Executor[],
) => Promise<{ kind: "input"; input: Input } | { kind: "exit"; message: string }>;
export type Transformer = (input: Input) => Tasks;
export type TaskScheduler = (markdot: Tasks, filterFragments: Input["fragments"]) => Tasks;
export type Runner = (tasks: Tasks) => Promise<void>;

const markdot =
  ({
    transformer,
    taskScheduler,
    runner,
  }: {
    transformer: Transformer;
    taskScheduler: TaskScheduler;
    runner: Runner;
  }) =>
  async (input: Input): ReturnType<Runner> => {
    const [tasks] = [input].map(transformer).map((tasks) => taskScheduler(tasks, input.fragments));

    return await runner(tasks);
  };

const ctx: Ctx = {
  ...makeOsAdapter(),
  ...makeFsAdapter(),
  logger,
};

try {
  const result = await parseArguments(process.argv.slice(2), executors);

  if (result.kind === "exit") {
    ctx.logger.info(result.message, { label: false });
    process.exit(2);
  }

  await markdot({
    transformer: makeTransformer({
      parser: unified().use(remarkParse).use(remarkBreaks).use(remarkFrontmatter, ["yaml", "toml"]).use(remarkGfm),
      preprocessor: (text: string): string => {
        return Mustache.render(text, {
          platform: {
            [process.platform]: process.platform,
          },
          username: {
            [os.userInfo().username]: os.userInfo().username,
          },
          hostname: {
            [os.hostname()]: os.hostname(),
          },
          env: { ...getEnv() },
          ignore: false, // to ignore multiple codeblocks at once.
        });
      },
    }),
    taskScheduler: makeTaskScheduler(),
    runner: makeRunner({ executors, ctx }),
  })(result.input);

  ctx.logger.success("finished.");
} catch (obj) {
  if (obj instanceof Error) {
    ctx.logger.error("[error]");
    ctx.logger.error(obj.message, { label: false });
    ctx.logger.error("[trace]");
    ctx.logger.error(obj.stack ?? "", { label: false });
  }
  process.exit(1);
}
