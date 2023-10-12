import fs from "fs";
import os from "os";
import path from "path";
import chalkTemplate from "chalk-template";
import { Ctx } from ".";
import { mergeEnv } from "./getEnv";
import { logger } from "./logger";

const resolveTilde = (filePath: string): string => {
  if (filePath[0] === "~") {
    return path.join(os.homedir(), filePath.slice(1));
  }
  return filePath;
};

export const adapter = (env: Ctx["env"]) => {
  return {
    exists: async (path: string) => {
      return await Bun.file(resolveTilde(path)).exists();
    },
    read: async (path: string) => {
      return await Bun.file(resolveTilde(path)).text();
    },
    write: async (filePath: string, input: string) => {
      const _path = resolveTilde(filePath);
      const file = Bun.file(_path);
      if (!(await file.exists())) {
        // Ensure directory exists before writing
        fs.mkdirSync(path.dirname(_path), { recursive: true });
      }

      await Bun.write(file, `${input}\n`);
    },
    exec: async (
      command: string[],
      stdin: string,
      opt: { env: Record<string, string | string[]> } | undefined,
    ): Promise<void> => {
      logger.info(chalkTemplate`[command] {dim ${command.join(" ")}}`);
      const proc = Bun.spawnSync(command, {
        stdin: new TextEncoder().encode(stdin),
        stdout: "inherit",
        stderr: "inherit",
        env: mergeEnv({ ...env }, { ...opt?.env }),
      });

      if (!proc.success) {
        throw Error("failed exec");
      }
    },
  };
};
