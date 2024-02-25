export { helpText };

import chalkTemplate from "chalk-template";

const helpText = (): string => {
  return chalkTemplate`{bold # MarkDot}

        {red Mark}down {red Dot}file.

{bold ## USAGE}

    {dim $} {bold markdot} {underline path}
    {dim $} {bold markdot} {underline path#foo}
    {dim $} cat dotfile.md | {bold markdot}
    {dim $} cat dotfile.md | {bold markdot --fragment=foo}

{bold ## OPTIONS}
    --help, -h                  Shows this help message
    --fragment {underline fragment}         Filter task to run with fragment
`;
};
