import chalkTemplate from "chalk-template";
import { Executor } from ".";

export const helpText = (executors: Executor[]): string => {
  return chalkTemplate`{bold # MarkDot}

        {red Mark}down {red Dot}file.

{bold ## USAGE}

    {dim $} {bold markdot} [--help, -h] --file {underline path}

{bold ## OPTIONS}
    --help, -h                  Shows this help message
    --doc {underline resource}              Show document. See #DOCUMENTS section below.
                                example: \`markdot --doc ::ignore\`.
    --file {underline path}                 Markdown file path
    --fragment {underline fragment}         filter task to run with fragment

{bold # DOCUMENTS}

You can find some document with these command.

{bold ## about MarkDot}

markdot --doc about

{bold ## langs}

${executors
  .filter((x) => x.kind === "lang")
  .map((x) => `markdot --doc ${x.name}`)
  .join("\n")}

{bold ## tags}

${executors
  .filter((x) => x.kind === "tag")
  .map((x) => `markdot --doc ${x.name}`)
  .join("\n")}
`;
};
