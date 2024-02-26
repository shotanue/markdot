import { Adapter } from "../adapter";

export { executeShellScript };

type Execute = (args: {
  code: string;
  exec: Adapter["exec"];
  log: Adapter["log"];
  env: Record<string, string>;
}) => Promise<void>;

const executeShellScript: Execute = async ({ code, exec, env, log }) => {
  await exec({
    command: ["bash"],
    stdin: code,
    env,
    log,
  });
};
