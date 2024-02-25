export { parseArguments };
import arg from "arg";

type ParseArguments = (
  argv: string[],
  stdin: string,
) => Promise<
  | { kind: "stdin"; text: string; fragments: string[] }
  | { kind: "file"; path: string; fragments: string[] }
  | { kind: "help" }
  | { kind: "exit"; message: string }
>;

const parseArguments: ParseArguments = async (argv, stdin) => {
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

  if (args["_"].length === 1) {
    const path = args["_"][0];
    return {
      kind: "file",
      path,
      fragments: [new URL(`file://${path}`).hash.slice(1)],
    };
  }

  if (args["--help"]) {
    return {
      kind: "help",
    };
  }

  if (stdin !== "") {
    return {
      kind: "stdin",
      text: stdin,
      fragments: args["--fragment"] ?? [],
    };
  }

  return {
    kind: "help",
  };
};
