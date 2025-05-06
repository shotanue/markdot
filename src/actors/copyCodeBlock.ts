import type { Actor } from "./index";

export { copyCodeBlock };

type CopyCodeBlock = Actor<{
  text: string;
  to: string;
  permission?: number;
}>;

const copyCodeBlock: CopyCodeBlock = ({ text, to, permission }) => {
  return {
    kind: "copyCodeBlock",
    info: {
      text,
      to,
      permission,
    },
    run: async ({ write, log }) => {
      try {
        await write({
          input: text,
          path: to,
          permission,
        });
      } catch (e) {
        log.error(`Failed writing. path: ${to}`);
        throw e;
      }

      log.info(`Success writing. path:${to}`);
    },
  };
};
