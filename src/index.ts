import os from "os";
import { executors, makeRunner } from "./makeRunner";
import { makeTaskScheduler } from "./makeTaskScheduler";
import { makeTransformer } from "./makeTransformer";
import { helpText, parseArguments } from "./parseArguments";
import { getEnv } from "./getEnv";
import { logger } from "./logger";
import { makeFsAdapter } from "./makeFsAdapter";
import { makeOsAdapter } from "./makeOsAdapter";
import { markdot } from "./markdot";

import aboutPage from "@resources/about.md";

type Fragment = {
  depth: number;
  text: string;
};

export type Input = {
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
  env: Record<string, string>;
  meta: {
    platform: string;
    username: string;
    hostname: string;
  };
};

const ctx: Ctx = {
  ...makeOsAdapter(),
  ...makeFsAdapter(),
  logger,
  env: getEnv(),
  meta: {
    hostname: os.hostname(),
    platform: os.arch(),
    username: os.userInfo().username,
  },
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
) => Promise<
  | { kind: "input"; input: Input }
  | { kind: "help" }
  | { kind: "doc"; resource: string }
  | { kind: "exit"; message: string }
>;
export type Transformer = (input: Input) => Tasks;
export type TaskScheduler = (markdot: Tasks, filterFragments: Input["fragments"]) => Tasks;
export type Runner = (tasks: Tasks) => Promise<void>;

try {
  const result = await parseArguments(process.argv.slice(2));

  if (result.kind === "help") {
    ctx.logger.info(helpText(executors), { label: false });
    process.exit(2);
  }

  if (result.kind === "doc") {
    const resource =
      result.resource === "about" ? aboutPage : executors.find((x) => x.name === result.resource)?.doc ?? undefined;

    if (resource === undefined) {
      ctx.logger.error("resource not found. doc: " + resource);
      process.exit(1);
    }

    ctx.logger.info(await Bun.file(resource).text(), { label: false });
    process.exit(2);
  }

  if (result.kind === "exit") {
    ctx.logger.info(result.message, { label: false });
    process.exit(2);
  }

  await markdot({
    transformer: makeTransformer(ctx),
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
