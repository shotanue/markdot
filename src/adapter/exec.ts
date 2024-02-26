export { exec };

import chalkTemplate from "chalk-template";
import { Adapter } from ".";

const exec: Adapter["exec"] = async ({ command, stdin, env, log }) => {
  log.info(chalkTemplate`[command] {dim ${command.join(" ")}}`);

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
