import { TaskScheduler } from ".";

type MakeTaskScheduler = () => TaskScheduler;
export const makeTaskScheduler: MakeTaskScheduler = () => (tasks, filterFragments) => {
  return {
    ...tasks,
    list:
      filterFragments.length === 0
        ? tasks.list
        : tasks.list.filter((task) => {
            for (const fragment of filterFragments) {
              if (task.fragments.find((x) => x.text === fragment)) {
                return true;
              }
            }

            return false;
          }),
  };
};
