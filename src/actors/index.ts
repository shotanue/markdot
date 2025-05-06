import type { Adapter } from "../adapter";

export type { Actor, ScheduledActor };

type ScheduledActor = {
  kind: "copyCodeBlock" | "executeBrewfile" | "executeShellScript" | "createSymlink" | "createHardCopy";
  info: Record<string, unknown>;
  run: (adapter: Adapter) => Promise<void>;
};

type Actor<T> = (args: T) => ScheduledActor;
