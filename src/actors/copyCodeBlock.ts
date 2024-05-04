import type { Adapter } from "../adapter";

export { copyCodeBlock };

type CopyCodeBlock = (args: {
  text: string;
  to: string;
  write: Adapter["write"];
  permission?: number;
}) => Promise<void>;

const copyCodeBlock: CopyCodeBlock = async ({ text, to, write, permission }) => {
  await write({
    input: text,
    path: to,
    permission,
  });
};
