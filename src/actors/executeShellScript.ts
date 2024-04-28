import type { Adapter } from "../adapter";

export { executeShellScript };

type Execute = (args: {
  code: string;
  lang: string;
  exec: Adapter["exec"];
  log: Adapter["log"];
  env: Record<string, string>;
}) => Promise<void>;

const langAlias = new Map<string, string[]>();
langAlias.set("nushell", ["nu", "/dev/stdin"]);
langAlias.set("nu", ["nu", "/dev/stdin"]);
langAlias.set("fish", ["fish", "/dev/stdin"]);

const executeShellScript: Execute = async ({ code, lang, exec, env, log }) => {
  await exec({
    command: langAlias.get(lang) ?? [lang],
    stdin: code,
    env,
    log,
  });
};
