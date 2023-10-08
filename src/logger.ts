import chalkTemplate from "chalk-template";
import { Ctx } from ".";

export const logger: Ctx["logger"] = {
  info: (message, { label } = { label: true }) => {
    console.info(`${label ? "[markdot]" : ""} ${message}`);
  },
  warn: (message, { label } = { label: true }) => {
    console.warn(chalkTemplate`{yellow ${label ? "[markdot]" : ""} ${message}}`);
  },
  error: (message, { label } = { label: true }) => {
    console.error(`${label ? "[markdot]" : ""} ${message}`);
  },
  success: (message, { label } = { label: true }) => {
    console.log(chalkTemplate`{green ${label ? "[markdot]" : ""} ${message}}`);
  },
};
