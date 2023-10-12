import arg from "arg";
import { ParseArguments } from ".";

export const parseArguments: ParseArguments = async (argv, stdin) => {
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

  if (args["--help"]) {
    return {
      kind: "help",
    };
  }

  if (args["--doc"]) {
    return {
      kind: "doc",
      resource: args["--doc"],
    };
  }

  if (stdin !== "") {
    return {
      kind: "stdin",
      text: stdin,
      fragments: args["--fragment"] ?? [],
    };
  }

  if (args["--file"]) {
    return {
      kind: "file",
      path: args["--file"],
      fragments: args["--fragment"] ?? [],
    };
  }

  return {
    kind: "help",
  };
};
