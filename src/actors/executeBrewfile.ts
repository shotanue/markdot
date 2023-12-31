import { Adapter } from "../adapter";

export { executeBrewfile };

type ExecuteBrewfile = (args: {
  brew: { brewfile: string; args: string };
  exec: Adapter["exec"];
  env: Record<string, string>;
}) => Promise<void>;

const executeBrewfile: ExecuteBrewfile = async ({ brew, exec, env }) => {
  await exec({
    command: [...["brew", "bundle"], ...brew.args.split(" "), "--file=-"].filter((x) => x !== ""),
    stdin: brew.brewfile,
    env,
  });
};
