import { chmodSync } from "node:fs";
import type { Adapter } from ".";
import { resolveTilde } from "./resolveTilde";

export { write };

const write: Adapter["write"] = async ({ path, input, permission }) => {
  await Bun.write(resolveTilde(path), `${input}\n`);
  if (permission !== undefined) {
    if (permission > 0o777) {
      throw new Error("Permission value must be between 000 and 777.");
    }
    chmodSync(resolveTilde(path), permission);
  }
};
