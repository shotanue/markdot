export { markdot };

import * as adapter from "./adapter";
import { scheduleTasks } from "./workflow";

const markdot = async ({ markdownText, fragments }: { markdownText: string; fragments: string[] }): Promise<void> => {
  const tasksToRun = scheduleTasks({
    markdownText,
    fragments,
  });

  for (const actor of tasksToRun) {
    await actor.run(adapter);
  }
};
