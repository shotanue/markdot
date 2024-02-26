export { markdot };

import { createActor } from "xstate";
import { machine } from "./workflow";

const markdot = (args: { markdownText: string; fragments: string[] }): Promise<void> => {
  const actor = createActor(machine);

  const running = new Promise<void>((resolve, reject) => {
    actor.start().subscribe({
      complete: () => {
        if (actor.getSnapshot().value === "error") {
          console.error("error");
          console.error(actor.getSnapshot().context.history);
          reject();
          return;
        }
        resolve();
      },
      error: (err) => {
        reject(err);
      },
    });

    actor.send({ type: "run", params: { markdownText: args.markdownText, fragments: args.fragments } });
  });

  return running;
};
