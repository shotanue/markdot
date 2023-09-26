import { symlinkSync } from "fs";
import chalkTemplate from "chalk-template";
import remarkBreaks from "remark-breaks";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { isArrayBuffer } from "util/types";
import { executors, makeRunner } from "./makeRunner";
import { makeTaskScheduler } from "./makeTaskScheduler";
import { makeTransformer } from "./makeTransformer";
import { parseArguments } from "./parseArguments";

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
  preferences: {
    hyperlink: {
      type: "symlink" | "copy";
    };
  };
  list: Task[];
};

type Log = (message: string, options?: { label: boolean }) => void;
export type Ctx = {
  logger: {
    info: Log;
    warn: Log;
    error: Log;
    success: Log;
  };
  exec: (command: string[], stdin: string, opt?: { env?: Record<string, string | string[]> }) => Promise<void>;
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

const logger: Ctx["logger"] = {
  info: (message, { label } = { label: true }) => {
    console.info(`${label ? "[markdot]" : ""} ${message}`);
  },
  warn: (message, { label } = { label: true }) => {
    console.warn(chalkTemplate`{yellow ${label ? "[markdot]" : ""} ${message}}`);
  },
  error: (message, { label } = { label: true }) => {
    console.error(`${label ? "[markdot]" : ""} ${message}`);
  },
  success: (message, { label } = { label: true }) => {
    console.log(chalkTemplate`{green ${label ? "[markdot]" : ""} ${message}}`);
  },
};
const ctx: Ctx = {
  exec: async (command, stdin, opt) => {
    const replaceEnvVars = (str: string, env: Record<string, string | undefined>): string => {
      return str.replace(/\$([A-Z_][A-Z_0-9]*)/g, (_, varName) => env[varName] || `$${varName}`);
    };

    const mergeEnv = (
      a: Record<string, string | undefined>,
      b: Record<string, string | string[]>,
    ): Record<string, string> => {
      const result: Record<string, string> = {};

      // Combine keys from both records
      const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);

      for (const key of allKeys) {
        if (a[key] && b[key]) {
          const valueFromB = Array.isArray(b[key])
            ? (b[key] as string[]).map((item) => replaceEnvVars(item, a)).join(":")
            : replaceEnvVars(b[key] as string, a);

          result[key] = `${a[key]}:${valueFromB}`;
        } else if (a[key]) {
          result[key] = a[key] ?? "";
        } else {
          const valueFromB = Array.isArray(b[key])
            ? (b[key] as string[]).map((item) => replaceEnvVars(item, a)).join(":")
            : replaceEnvVars(b[key] as string, a);

          result[key] = valueFromB;
        }
      }
      return result;
    };

    logger.info(chalkTemplate`[command] {dim ${command.join(" ")}}`);
    const proc = Bun.spawnSync(command, {
      stdin: new TextEncoder().encode(stdin),
      stdout: "inherit", // redirect to parent's stdout
      stderr: "pipe", // To throw Error with stderr text, set pipe.
      env: mergeEnv({ ...process.env }, { ...opt?.env }),
    });

    if (!proc.success) {
      throw new Error(proc.stderr.toString());
    }
  },
  exists: async ({ path }) => await Bun.file(path).exists(),
  read: async ({ path }) => {
    return await Bun.file(path).text();
  },
  write: async ({ path, input }) => {
    await Bun.write(Bun.file(path), input);
  },
  symlink: async ({ src, referer }) => {
    const symlinkDirection = `${referer} ==> ${src}`;
    if (await Bun.file(referer).exists()) {
      logger.info(`skip to create symlink. ${symlinkDirection}`);
      return;
    }
    symlinkSync(src, referer);
    logger.success(`created symlink. ${symlinkDirection}`);
  },
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
    }),
    taskScheduler: makeTaskScheduler(),
    runner: makeRunner({ executors, ctx }),
  })(result.input);

  ctx.logger.success("finished.");
} catch (obj) {
  if (obj instanceof Error) {
    // ctx.logger.error(obj.name);
    ctx.logger.error(obj.message);
  }
  process.exit(1);
}
