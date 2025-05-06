import { copyFile, exists, mkdir } from "node:fs/promises";
import path from "node:path";
import type { Adapter } from ".";
import { resolveTilde } from "./resolveTilde";

export { createHardCopy };

const createHardCopy: Adapter["createHardCopy"] = async (args) => {
  try {
    const from = resolveTilde(args.from);
    const to = resolveTilde(args.to);
    if (from === to) {
      return;
    }
    if (!(await exists(from))) {
      throw new Error(`${from} does not exist`);
    }
    if (!(await exists(to))) {
      await mkdir(path.dirname(to), { recursive: true });
    }
    await copyFile(from, to);
  } catch (e) {
    if (typeof e === "object" && e !== null && "code" in e && e.code === "EEXIST") {
      return;
    }
    console.error("hard copy error", args);
    throw e;
  }
};
