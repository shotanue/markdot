import chalkTemplate from "chalk-template";
import type { Actor } from ".";

export { executeShellScript };

type Execute = Actor<{
  code: string;
  lang: string;
  env: Record<string, string>;
}>;

const langAlias = {
  nushell: ["nu", "/dev/stdin"],
  nu: ["nu", "/dev/stdin"],
  fish: ["fish", "/dev/stdin"],
};

const executeShellScript: Execute = ({ code, lang, env }) => {
  return {
    kind: "executeShellScript",
    info: {
      code,
      lang,
    },
    run: async ({ exec, log }) => {
      const command = langAlias[lang as keyof typeof langAlias] ?? [lang];
      const stdin = code;

      log.info(chalkTemplate`[command] {dim ${[command, stdin].join(" ")}}`);

      try {
        await exec({
          command,
          stdin,
          env,
          log,
        });
      } catch (e) {
        log.error(`Failed executing shell script. lang: ${lang}`);
        throw e;
      }
    },
  };
};
