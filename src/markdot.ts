export { markdot };

import { createMachine, createActor, setup, fromPromise, enqueueActions, assign } from "xstate";
import { Task } from ".";
import { produce } from "immer";

const markdot = (args: { markdownText: string; fragments: string[] }): Promise<void> => {
  const shellScriptMachine = createMachine({});
  const brewfileMachine = createMachine({});
  const copyCodeBlockMachine = createMachine({});

  const machine = setup({
    types: {} as {
      context: {
        markdownText: string;
        framgments: string[];
        tasks: Task[];
      };
      events: { type: "run" } | { type: "tasksLoaded" };
    },
    actions: {
      loadTasks: () => {},
      clearTasks: assign(({ context }) => {
        return produce(context, (draftContext) => {
          draftContext.tasks = [];
        });
      }),
    },
    actors: {
      executeShellScript: fromPromise<unknown, { task: Task }>(async ({ input }) => {
        input.task;
      }),
      executeBrewfile: fromPromise<unknown, { task: Task }>(async () => {}),
      copyCodeBlock: fromPromise<unknown, { task: Task }>(async () => {}),
    },
  }).createMachine({
    initial: "idle",
    context: {
      markdownText: "",
      framgments: [],
      tasks: [],
    },
    states: {
      idle: {
        on: {
          run: "loadingTasks",
        },
      },
      loadingTasks: {
        entry: {
          type: "loadTasks",
        },
        always: {
          target: "tasksLoaded",
        },
      },
      tasksLoaded: {
        entry: enqueueActions(({ enqueue, context }) => {
          context.tasks.map((task) => {
            // switch task kind then, spawn runner
            if (task.kind === "codeblock" && ["bash", "sh"].includes(task.lang.toLowerCase())) {
              enqueue.spawnChild("executeShellScript", { input: { task } });
            }
            if (task.kind === "codeblock" && task.lang.toLowerCase() === "brewfile") {
              enqueue.spawnChild("executeBrewfile", { input: { task } });
            }
            if (task.kind === "codeblock" && "::to" in task.meta) {
              enqueue.spawnChild("copyCodeBlock", { input: { task } });
            }
          });

          enqueue("clearTasks");
        }),
        always: {
          target: "done",
        },
      },
      done: {
        type: "final",
      },
    },
  });

  machine.provide({
    actions: {},
  });
  const actor = createActor(machine);

  const running = new Promise<void>((resolve, reject) => {
    actor.start().subscribe({
      complete: () => {
        console.log("done");
        resolve();
      },
      error: (err) => {
        reject(err);
      },
    });

    actor.send({ type: "run" });
  });

  return running;
};
