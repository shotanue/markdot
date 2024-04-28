import type { Adapter } from "../adapter";

export { copyCodeBlock };

type CopyCodeBlock = (args: { text: string; to: string; write: Adapter["write"] }) => Promise<void>;
const copyCodeBlock: CopyCodeBlock = async ({ text, to, write }) => {
  await write({
    input: text,
    path: to,
  });
};
