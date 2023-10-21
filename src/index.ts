import os from "os";
import { adapter } from "./adapter";
import { executors } from "./executors";
import { getEnv } from "./getEnv";
import { helpText } from "./helpText";
import { logger } from "./logger";
import { makeTransformer } from "./makeTransformer";
import { parseArguments } from "./parseArguments";

import aboutPage from "@resources/about.md";
import { getStdin } from "./getStdin";
import { makeMarkdot } from "./makeMarkdot";

type Fragment = {
  depth: number;
  text: string;
};

export type Input = {
  markdownText: string; // from: file|stdin
  fragments: string[];
};

export type Task = {
  kind: "codeblock";
  lang: string;
  meta: Record<string, string>;
  code: string;
  fragments: Fragment[];
  breadcrumb: string;
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
  exists: (path: string) => Promise<boolean>;
  read: (path: string) => Promise<string>;
  write: (filePath: string, input: string) => Promise<void>;
  env: Record<string, string>;
  meta: {
    arch: string;
    platform: string;
    hostname: string;
    username: string;
  };
};

const env = getEnv();

const ctx: Ctx = {
  ...adapter(env),
  logger,
  env,
  meta: {
    arch: os.arch(),
    platform: os.platform(),
    hostname: os.hostname(),
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
  stdin: string,
) => Promise<
  | { kind: "stdin"; text: string; fragments: string[] }
  | { kind: "file"; path: string; fragments: string[] }
  | { kind: "help" }
  | { kind: "doc"; resource: string }
  | { kind: "exit"; message: string }
>;
export type Transformer = (input: Input) => Tasks;
export type Runner = (tasks: Tasks) => Promise<void>;

try {
  const result = await parseArguments(
    process.argv.slice(2),
    await getStdin(process.stdin.isTTY, () => Bun.stdin.stream()),
  );

  if (result.kind === "help") {
    ctx.logger.info(helpText(executors), { label: false });
    process.exit(2);
  }

  if (result.kind === "doc") {
    const resource =
      result.resource === "about" ? aboutPage : executors.find((x) => x.name === result.resource)?.doc ?? undefined;

    if (resource === undefined) {
      ctx.logger.error(`resource not found. doc: ${resource}`);
      process.exit(2);
    }

    ctx.logger.info(await Bun.file(resource).text(), { label: false });
    process.exit(2);
  }

  if (result.kind === "exit") {
    ctx.logger.info(result.message, { label: false });
    process.exit(1);
  }

  const text = result.kind === "stdin" ? result.text : await Bun.file(result.path).text();

  const markdot = makeMarkdot({
    ctx,
    transformer: makeTransformer(ctx),
    executors,
  });

  await markdot(text, { fragments: result.fragments });

  ctx.logger.success("done");
} catch (obj) {
  if (obj instanceof Error) {
    ctx.logger.error("[error]");
    ctx.logger.error(obj.message, { label: false });
    ctx.logger.error("[trace]");
    ctx.logger.error(obj.stack ?? "", { label: false });
  }
  process.exit(1);
}
