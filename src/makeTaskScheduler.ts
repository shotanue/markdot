import { TaskScheduler } from ".";

type MakeTaskScheduler = () => TaskScheduler;
export const makeTaskScheduler: MakeTaskScheduler = () => (tasks, filterLabels) => {
  return {
    ...tasks,
    list:
      filterLabels.length === 0
        ? tasks.list
        : tasks.list.filter((task) => {
            for (const label of filterLabels) {
              if (task.labels.includes(label)) {
                return true;
              }
            }

            return false;
          }),
  };
};
