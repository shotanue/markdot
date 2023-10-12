import { Transformer, TaskScheduler, Runner, Input } from ".";

export const markdot =
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
