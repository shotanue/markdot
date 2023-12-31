import { Adapter } from ".";
import { resolveTilde } from "./resolveTilde";

export { write };

const write: Adapter["write"] = async ({ path, input }) => {
  await Bun.write(resolveTilde(path), `${input}\n`);
};
