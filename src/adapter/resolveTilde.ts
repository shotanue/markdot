export { resolveTilde };

import os from "os";
import path from "path";

const resolveTilde = (filePath: string): string => {
  if (filePath[0] === "~") {
    return path.join(os.homedir(), filePath.slice(1));
  }
  return filePath;
};
