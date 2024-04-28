export { parseArguments };
import arg from "arg";

type ParseArguments = (
  argv: string[],
  stdin: string,
) => Promise<
  | { kind: "stdin"; text: string; fragments: string[] }
  | { kind: "file"; path: string; fragments: string[] }
  | { kind: "help" }
  | { kind: "version" }
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
      "--version": Boolean,
      "-v": "--version",
    },
    { argv },
  );

  if (args._.length === 1) {
    const [path, fragment] = args._[0].split("#");

    return {
      kind: "file",
      path,
      fragments: fragment ? [fragment] : [],
    };
  }

  if (args["--help"] || args["-h"]) {
    return {
      kind: "help",
    };
  }

  if (args["--version"] || args["-v"]) {
    return {
      kind: "version",
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
