import chalkTemplate from "chalk-template";
import type { Actor } from ".";

export { executeBrewfile };

type ExecuteBrewfile = Actor<{
  brew: { brewfile: string; args: string };
  env: Record<string, string>;
}>;

const executeBrewfile: ExecuteBrewfile = ({ brew, env }) => {
  return {
    kind: "executeBrewfile",
    info: {
      brew,
    },
    run: async ({ exec, log }) => {
      const command = [...["brew", "bundle"], ...brew.args.split(" "), "--file=-"].filter((x) => x !== "");
      const stdin = brew.brewfile;

      log.info(chalkTemplate`[command] {dim ${[command, stdin].join(" ")}}`);

      try {
        await exec({
          command,
          stdin,
          env,
          log,
        });
      } catch (e) {
        log.error(`Failed executing brewfile. args: ${brew.args}`);
        throw e;
      }

      log.info(`Success executing brewfile. args: ${brew.args}`);
    },
  };
};
