import chalkTemplate from "chalk-template";
import { getEnv } from "./getEnv";
import { logger } from "./logger";
import { Ctx } from ".";

export const makeOsAdapter = (): Pick<Ctx, "exec"> => {
  const exec = async (
    command: string[],
    stdin: string,
    opt: { env: Record<string, string | string[]> } | undefined,
  ): Promise<void> => {
    logger.info(chalkTemplate`[command] {dim ${command.join(" ")}}`);
    const proc = Bun.spawnSync(command, {
      stdin: new TextEncoder().encode(stdin),
      stdout: "inherit",
      stderr: "inherit",
      env: getEnv(opt?.env),
    });

    if (!proc.success) {
      throw Error("failed exec");
    }
  };

  return {
    exec,
  };
};
