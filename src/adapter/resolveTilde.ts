export { resolveTilde };

import os from "node:os";
import path from "node:path";

const resolveTilde = (filePath: string): string => {
  if (filePath[0] === "~") {
    return path.join(os.homedir(), filePath.slice(1));
  }
  return filePath;
};
