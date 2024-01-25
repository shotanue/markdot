export { helpText };

import chalkTemplate from "chalk-template";

const helpText = (): string => {
  return chalkTemplate`{bold # MarkDot}

        {red Mark}down {red Dot}file.

{bold ## USAGE}

    {dim $} {bold markdot} [--help, -h] --file {underline path}

{bold ## OPTIONS}
    --help, -h                  Shows this help message
    --file {underline path}                 Markdown file path
    --fragment {underline fragment}         filter task to run with fragment
`;
};
