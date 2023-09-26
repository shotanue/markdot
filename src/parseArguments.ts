import aboutPage from "@resources/about.md";
import arg from "arg";
import chalkTemplate from "chalk-template";
import { ParseArguments } from ".";

export const parseArguments: ParseArguments = async (argv, executors) => {
  const args = arg(
    {
      "--help": Boolean,
      "-h": "--help",
      "--doc": String,
      "--fragment": [String],
      "--file": String,
    },
    { argv },
  );

  if (argv.length === 0 || args["--help"]) {
    return {
      error: {
        message: chalkTemplate`{bold # MarkDot}

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
`,
      },
    };
  }

  if (args["--doc"]) {
    const resource =
      args["--doc"] === "about" ? aboutPage : executors.find((x) => x.name === args["--doc"])?.doc ?? undefined;
    if (resource === undefined) {
      throw Error("resource not found. ");
    }

    return {
      data: {
        markdownText: "",
        labels: [],
        doc: await Bun.file(resource).text(),
      },
    };
  }

  const markdownText = [args["--file"] ? await Bun.file(args["--file"]).text() : ""].find((x) => x.length > 0) ?? "";

  if (markdownText === "") {
    throw Error(
      "missing required argument: markdown text. give it with `--file=FILE_NAME.md` or stdin. `cat dotfile.md | markdot`",
    );
  }

  return {
    data: {
      markdownText,
      labels: args["--fragment"] ?? [],
      doc: "",
    },
  };
};
