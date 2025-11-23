import type { Adapter } from ".";
import { resolveTilde } from "./resolveTilde";

export { read };

const read: Adapter["read"] = async ({ path, fallback }) => {
  const p = resolveTilde(path);

  if (await Bun.file(p).exists()) {
    return await Bun.file(p).text();
  }

  return fallback;
};
