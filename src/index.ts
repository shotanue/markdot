import chalkTemplate from "chalk-template";
import remarkBreaks from "remark-breaks";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { executors, makeRunner } from "./makeRunner";
import { makeTaskScheduler } from "./makeTaskScheduler";
import { makeTransformer } from "./makeTransformer";
import { parseArguments } from "./parseArguments";

export type Result<T, E> = { data: T; error?: undefined } | { data?: undefined; error: E };

type Input = {
  markdownText: string; // from: file|stdin
  labels: string[];
};

type Task = {
  lang: string;
  meta: Record<string, string>;
  code: string;
  fragments: string[];
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
  exec: (command: string[], stdin: string) => Result<Record<string, unknown>, { exitCode: number }>;
};
export type Executor = {
  name: string;
  kind: "lang" | "tag" | "markup";
  doc: string;
  matcher: (info: Pick<Task, "lang" | "meta">) => boolean;
  execute: (task: Pick<Task, "meta" | "fragments" | "code">, ctx: Ctx) => ReturnType<Ctx["exec"]>;
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
) => Promise<Result<Input & { doc: string }, { message: string }>>;
export type Transformer = (input: Input) => Tasks;
export type TaskScheduler = (markdot: Tasks, filterLabels: Input["labels"]) => Tasks;
export type Runner = (tasks: Tasks) => Promise<Result<{ message: string }, { obj: Error }>>;

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
    try {
      const [tasks] = [input].map(transformer).map((tasks) => taskScheduler(tasks, input.labels));

      return await runner(tasks);
    } catch (e) {
      const obj = e instanceof Error ? e : Error("unexpected error");
      return {
        error: {
          obj,
        },
      };
    }
  };

const _executors = [executors.bash, executors.brewfile, executors["::to"]];

const ctx: Ctx = {
  exec: (command, stdin) => {
    const proc = Bun.spawnSync(command, {
      stdin: new TextEncoder().encode(stdin),
      // redirect to parent's stdout/stderr
      stdout: "inherit",
      stderr: "inherit",
    });

    if (!proc.success) {
      return {
        error: {
          exitCode: 1,
        },
      };
    }

    return {
      data: {},
    };
  },
  logger: {
    info: (message, { label } = { label: true }) => {
      console.info(`${label ? "[markdot]" : ""}${message}`);
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
  },
};

try {
  const { data, error } = await parseArguments(process.argv.slice(2), _executors);

  if (error) {
    ctx.logger.info(error.message, { label: false });
    process.exit(2);
  }

  if (data.doc !== "") {
    ctx.logger.info(data.doc, { label: false });
    process.exit();
  }

  const result = await markdot({
    transformer: makeTransformer({
      parser: unified().use(remarkParse).use(remarkBreaks).use(remarkFrontmatter, ["yaml"]).use(remarkGfm),
    }),
    taskScheduler: makeTaskScheduler(),
    runner: makeRunner({ executors: _executors, ctx }),
  })(data);

  if (result.error) {
    throw result.error.obj;
  }

  ctx.logger.success("finished.");
} catch (err) {
  ctx.logger.error(String(err), { label: false });
  // ctx.logger.error(JSON.stringify(err))
  process.exit(1);
}
