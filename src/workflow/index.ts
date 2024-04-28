export { machine };

import os from "node:os";
import { produce } from "immer";
import Mustache from "mustache";
import { and, assign, fromPromise, setup } from "xstate";
import { z } from "zod";

import { copyCodeBlock } from "../actors/copyCodeBlock";
import { executeBrewfile } from "../actors/executeBrewfile";
import { executeShellScript } from "../actors/executeShellScript";
import * as adapter from "../adapter";
import { mergeEnv } from "../env";
import { parseConfigs, parseMarkdown } from "../markdown";

export type Task = {
  kind: "codeblock";
  lang: string;
  meta: Record<string, string>;
  code: string;
  fragments: { depth: number; text: string }[];
  breadcrumb: string;
};

type Context = {
  markdownText: string;
  fragments: string[];
  tasks: Task[];
  history: Task[];
  preferences: {
    env: {
      append: Record<string, string>;
      override: Record<string, string>;
    };
  };
  env: Record<string, string>;
  meta: {
    arch: string;
    platform: string;
    hostname: string;
    username: string;
  };
};

/**
  Create the entire markdot workflow without argument parsing.
  For testing, it returns just xstate-machine.
*/
const machine = setup(
  // Setup bindings. Tests override these functions with `machine.provide()`.
  {
    types: {} as {
      context: Context;
      events: { type: "run"; params: { markdownText: string; fragments: string[] } };
    },
    actions: {
      setRunParams: assign(({ context, event }) =>
        produce(context, (draft) => {
          draft.markdownText = event.params.markdownText;
          draft.fragments = event.params.fragments;
        }),
      ),
      loadMeta: assign(({ context }) =>
        produce(context, (draft) => {
          draft.meta = {
            arch: os.arch(),
            platform: os.platform(),
            hostname: os.hostname(),
            username: os.userInfo().username,
          };
        }),
      ),
      loadConfigs: assign(({ context }) =>
        produce(context, (draft) => {
          const schema = z.object({
            env: z
              .object({
                append: z.record(z.string(), z.string()).default({}),
                override: z.record(z.string(), z.string()).default({}),
              })
              .default({
                append: {},
                override: {},
              }),
          });

          const config = parseConfigs({ markdownText: context.markdownText });
          draft.preferences = schema.parse(config);
        }),
      ),
      transformMarkdownIntoTasks: assign(({ context }) =>
        produce(context, (draft) => {
          const { meta, markdownText, fragments } = draft;
          const newText = Mustache.render(markdownText, {
            platform: {
              [meta.platform]: meta.platform,
            },
            username: {
              [meta.username]: meta.username,
            },
            hostname: {
              [meta.hostname]: meta.hostname,
            },
            meta: {
              ...meta,
            },
            ignore: false, // to ignore multiple codeblocks at once.
          });

          draft.tasks = parseMarkdown({ markdownText: newText, fragments });
        }),
      ),
      loadEnv: assign(({ context }) =>
        produce(context, (draft) => {
          draft.env = mergeEnv({
            a: { ...process.env },
            append: context.preferences?.env?.append ?? {},
            override: { ...context.preferences.env.override },
          });
        }),
      ),
      popTask: assign(({ context }) =>
        produce(context, (draft) => {
          const task = draft.tasks.shift();
          if (task) {
            draft.history.push(task);
          }
        }),
      ),
    },
    actors: {
      executeShellScript: fromPromise(async ({ input }: { input: { task: Task; context: Context } }) => {
        const { exec, log } = adapter;

        return executeShellScript({
          code: input.task.code,
          exec,
          env: input.context.env,
          log,
        });
      }),
      executeBrewfile: fromPromise(async ({ input }: { input: { task: Task; context: Context } }) => {
        const { exec, log } = adapter;
        return executeBrewfile({
          brew: {
            brewfile: input.task.code,
            args: input.task.meta["::args"] ?? "",
          },
          exec,
          env: input.context.env,
          log,
        }).then(() => {
          log.info("");
        });
      }),
      copyCodeBlock: fromPromise(async ({ input }: { input: { task: Task; context: Context } }) => {
        const { write, log } = adapter;
        const { to, text } = {
          to: input.task.meta["::to"],
          text: input.task.code,
        };

        return copyCodeBlock({ text, to, write })
          .then(() => {
            log.info(`Success writing. path:${to}`);
          })
          .catch(() => {
            log.error(`Failed writing. path: ${to}`);
          });
      }),
      ignoreTask: fromPromise(async () => {
        return;
      }),
    },
    guards: {
      emptyTask: ({ context }) => context.tasks.length === 0,
      codeblock: ({ context }) => context.tasks[0].kind === "codeblock",
      tag: ({ context }, name: string) => name in context.tasks[0].meta,
      lang: ({ context }, names: string[]) => names.includes(context.tasks[0].lang.toLowerCase()),
      matchIgnore: and([{ type: "codeblock" }, { type: "tag", params: "::ignore" }]),
      matchCopyCodeBlock: and([{ type: "codeblock" }, { type: "tag", params: "::to" }]),
      matchExecuteShellScript: and([{ type: "codeblock" }, { type: "lang", params: ["bash", "sh"] }]),
      matchExecuteBrewfile: and([{ type: "codeblock" }, { type: "lang", params: ["brewfile"] }]),
      fallback: () => true,
    },
  },
).createMachine(
  // define transitions
  {
    id: "workflow",
    initial: "idle",
    context: {
      markdownText: "",
      fragments: [],
      tasks: [],
      history: [],
      preferences: {},
      env: {},
      meta: {
        arch: "",
        platform: "",
        hostname: "",
        username: "",
      },
    },
    states: {
      idle: {
        on: {
          run: "init",
        },
      },
      init: {
        entry: [
          { type: "setRunParams" },
          // This may be confusing due to dependencies.
          // Aggregate them to a function may be better.
          { type: "loadMeta" }, // sets meta
          { type: "loadConfigs" }, // set preferences
          { type: "loadEnv" }, // depends on preferences
          { type: "transformMarkdownIntoTasks" }, // set tasks
        ],
        always: {
          target: "consumeTasks",
        },
      },
      enqueueTasks: {
        entry: [{ type: "transformMarkdownIntoTasks" }],
        always: {
          target: "consumeTasks",
        },
      },
      consumeTasks: {
        always: [
          { guard: "emptyTask", target: "done" },
          { guard: "matchIgnore", target: "ignore" },
          { guard: "matchCopyCodeBlock", target: "copyCodeBlock" },
          { guard: "matchExecuteShellScript", target: "executeShellScript" },
          { guard: "matchExecuteBrewfile", target: "executeBrewfile" },
          { guard: "fallback", target: "popTask" },
        ],
      },
      popTask: {
        entry: {
          type: "popTask",
        },
        always: {
          target: "consumeTasks",
        },
      },
      ignore: {
        invoke: {
          src: "ignoreTask",
          input: {},
          onDone: {
            target: "popTask",
          },
          onError: "error",
        },
      },
      copyCodeBlock: {
        invoke: {
          src: "copyCodeBlock",
          input: ({ context }) => ({
            context,
            task: context.tasks[0],
          }),
          onDone: {
            target: "popTask",
          },
        },
      },
      executeShellScript: {
        invoke: {
          src: "executeShellScript",
          input: ({ context }) => ({
            context,
            task: context.tasks[0],
          }),
          onDone: {
            target: "popTask",
          },
        },
      },
      executeBrewfile: {
        invoke: {
          src: "executeBrewfile",
          input: ({ context }) => ({
            context,
            task: context.tasks[0],
          }),
          onDone: {
            target: "popTask",
          },
        },
      },
      error: {
        type: "final",
      },
      done: {
        type: "final",
      },
    },
  },
);
