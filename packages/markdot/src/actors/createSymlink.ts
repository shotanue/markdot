import type { Actor } from "./index";

export { createSymlink };

type CreateSymlink = Actor<{
  from: string;
  to: string;
}>;

const createSymlink: CreateSymlink = ({ from, to }) => {
  return {
    kind: "createSymlink",
    info: {
      from,
      to,
    },
    run: async ({ createSymlink, log }) => {
      try {
        await createSymlink({
          from,
          to,
        });
      } catch (e) {
        log.error(`Failed creating symlink. from: ${from}, to: ${to}`);
        throw e;
      }

      log.info(`Success creating symlink. from: ${from}, to: ${to}`);
    },
  };
};
