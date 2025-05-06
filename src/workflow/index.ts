export { scheduleTasks };

import os from "node:os";
import Mustache from "mustache";
import { z } from "zod";

import type { ScheduledActor } from "../actors";
import { copyCodeBlock } from "../actors/copyCodeBlock";
import { createHardCopy } from "../actors/createHardCopy";
import { createSymlink } from "../actors/createSymlink";
import { executeBrewfile } from "../actors/executeBrewfile";
import { executeShellScript } from "../actors/executeShellScript";
import * as adapter from "../adapter";
import { mergeEnv } from "../env";
import { parseConfigs, parseMarkdown } from "../markdown";

type CodeBlockTask = {
  kind: "codeblock";
  lang: string;
  meta: Record<string, string | undefined>;
  code: string;
  fragments: {
    depth: number;
    text: string;
  }[];
  breadcrumb: string;
};

type CreateSymlink = {
  kind: "createSymlink";
  from: string;
  to: string;
  fragments: {
    depth: number;
    text: string;
  }[];
};

type CreateHardCopy = {
  kind: "createHardCopy";
  from: string;
  to: string;
  fragments: {
    depth: number;
    text: string;
  }[];
};

export type Task = CodeBlockTask | CreateSymlink | CreateHardCopy;

type Context = {
  markdownText: string;
  fragments: string[];
  tasks: Task[];
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

const tag = (task: Task, name: string) => {
  if (task.kind !== "codeblock") {
    throw Error(`kind is not codeblock. kind: ${task.kind}`);
  }
  return name in task.meta;
};

const lang = (task: Task, names: string[]) => {
  if (task.kind !== "codeblock") {
    return false;
  }
  return names.includes(task.lang.toLowerCase());
};

const loadContext = ({ markdownText, fragments }: { markdownText: string; fragments: string[] }): Context => {
  const meta = {
    arch: os.arch(),
    platform: os.platform(),
    hostname: os.hostname(),
    username: os.userInfo().username,
  };
  const preferences = z
    .object({
      env: z
        .object({
          append: z.record(z.string(), z.string()).default({}),
          override: z.record(z.string(), z.string()).default({}),
        })
        .default({
          append: {},
          override: {},
        }),
    })
    .parse(parseConfigs({ markdownText }));

  const context = {
    markdownText,
    fragments,
    tasks: parseMarkdown({
      markdownText: Mustache.render(markdownText, {
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
      }),
      fragments,
    }),
    preferences,
    env: mergeEnv({
      a: process.env,
      append: preferences.env.append,
      override: preferences.env.override,
    }),
    meta,
  } as const satisfies Context;

  return context;
};

const scheduleTasks = ({
  markdownText,
  fragments,
}: { markdownText: string; fragments: string[] }): ScheduledActor[] => {
  const schedule: ScheduledActor[] = [];

  const context = loadContext({ markdownText, fragments });

  if (context.tasks.length === 0) {
    adapter.log.info("no tasks");

    return schedule;
  }

  for (const task of context.tasks) {
    if (task.kind === "codeblock") {
      if (tag(task, "::ignore")) {
        continue;
      }

      if (tag(task, "::to")) {
        const { to, text, permission } = {
          to: task.meta["::to"] ?? "",
          text: task.code,
          permission: task.meta["::permission"] ? Number(`0o${task.meta["::permission"]}`) : undefined,
        };

        if (to === "") {
          throw new Error("::to must not be empty");
        }

        schedule.push(copyCodeBlock({ text, to, permission }));
      }

      if (lang(task, ["sh", "bash", "zsh", "fish", "nushell", "nu"])) {
        schedule.push(
          executeShellScript({
            code: task.code,
            lang: task.lang,
            env: context.env,
          }),
        );
      }

      if (lang(task, ["brewfile"])) {
        schedule.push(
          executeBrewfile({
            brew: {
              brewfile: task.code,
              args: task.meta["::args"] ?? "",
            },
            env: context.env,
          }),
        );
      }
    }

    if (task.kind === "createSymlink") {
      schedule.push(createSymlink({ from: task.from, to: task.to }));
    }

    if (task.kind === "createHardCopy") {
      schedule.push(createHardCopy({ from: task.from, to: task.to }));
    }
  }

  return schedule;
};
