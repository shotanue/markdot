import type { Actor } from "./index";

export { createHardCopy };

type CreateHardCopy = Actor<{
  from: string;
  to: string;
}>;

const createHardCopy: CreateHardCopy = ({ from, to }) => {
  return {
    kind: "createHardCopy",
    info: {
      from,
      to,
    },
    run: async ({ createHardCopy, log }) => {
      try {
        await createHardCopy({
          from,
          to,
        });
      } catch (e) {
        log.error(`Failed creating hard copy. from: ${from}, to: ${to}`);
        throw e;
      }

      log.info(`Success creating hard copy. from: ${from}, to: ${to}`);
    },
  };
};
