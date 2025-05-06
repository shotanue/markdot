export { exec };

import type { Adapter } from ".";

const exec: Adapter["exec"] = async ({ command, stdin, env }) => {
  const proc = Bun.spawnSync(command, {
    stdin: new TextEncoder().encode(stdin),
    stdout: "inherit",
    stderr: "inherit",
    env,
  });

  if (!proc.success) {
    throw Error("failed exec");
  }
};
