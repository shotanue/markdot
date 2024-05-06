import { symlink } from "node:fs/promises";
import type { Adapter } from ".";
import { resolveTilde } from "./resolveTilde";

export { createSymlink };

const createSymlink: Adapter["createSymlink"] = async (args) => {
  try {
    await symlink(resolveTilde(args.to), resolveTilde(args.from));
  } catch (e) {
    if (typeof e === "object" && e !== null && "code" in e && e.code === "EEXIST") {
      return;
    }
    console.error("symlink error", args);
    throw e;
  }
};
