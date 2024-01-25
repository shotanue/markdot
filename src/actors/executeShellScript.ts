import { Adapter } from "../adapter";

export { executeShellScript };

type Execute = (args: {
  code: string;
  exec: Adapter["exec"];
  env: Record<string, string>;
}) => Promise<void>;

const executeShellScript: Execute = async ({ code, exec, env }) => {
  await exec({
    command: ["bash"],
    stdin: code,
    env,
  });
};
