import fs from "fs";
import os from "os";
import path from "path";
import { logger } from "./logger";
import { Ctx } from ".";

export const makeFsAdapter = (): Pick<Ctx, "exists" | "read" | "write" | "symlink"> => {
  const resolveTilde = (filePath: string): string => {
    if (filePath[0] === "~") {
      return path.join(os.homedir(), filePath.slice(1));
    }
    return filePath;
  };

  return {
    exists: async (args) => {
      return await Bun.file(resolveTilde(args.path)).exists();
    },
    read: async (args) => {
      return await Bun.file(resolveTilde(args.path)).text();
    },
    write: async (args) => {
      const _path = resolveTilde(args.path);
      const file = Bun.file(_path);
      if (!(await file.exists())) {
        // Ensure directory exists before writing
        fs.mkdirSync(path.dirname(_path), { recursive: true });
      }

      await Bun.write(file, `${args.input}\n`);
    },
    symlink: async ({ src, referer }) => {
      const symlinkDirection = `${referer} ==> ${src}`;
      if (await Bun.file(referer).exists()) {
        logger.info(`skip to create symlink. ${symlinkDirection}`);
        return;
      }
      fs.symlinkSync(src, referer);
      logger.success(`created symlink. ${symlinkDirection}`);
    },
  };
};
