import type { Adapter } from "../adapter";

export { executeBrewfile };

type ExecuteBrewfile = (args: {
  brew: { brewfile: string; args: string };
  exec: Adapter["exec"];
  log: Adapter["log"];
  env: Record<string, string>;
}) => Promise<void>;

const executeBrewfile: ExecuteBrewfile = async ({ brew, exec, env, log }) => {
  await exec({
    command: [...["brew", "bundle"], ...brew.args.split(" "), "--file=-"].filter((x) => x !== ""),
    stdin: brew.brewfile,
    env,
    log,
  });
};
