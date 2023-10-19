import Mustache from "mustache";
import { Ctx } from ".";

export const preprocessor = (text: string, meta: Ctx["meta"], env: Ctx["env"]): string => {
  return Mustache.render(text, {
    platform: {
      [meta.platform]: meta.platform,
    },
    username: {
      [meta.username]: meta.username,
    },
    hostname: {
      [meta.hostname]: meta.hostname,
    },
    meta: {
      ...meta,
    },
    env: { ...env },
    ignore: false, // to ignore multiple codeblocks at once.
  });
};
