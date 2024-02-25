import { describe, expect, it } from "bun:test";
import { parseArguments } from "./parseArguments";

describe("parseArguments", () => {
  it('should return "help" kind when --help or -h is provided', async () => {
    expect(await parseArguments(["--help"], "")).toEqual({ kind: "help" });
    expect(await parseArguments(["-h"], "")).toEqual({ kind: "help" });
  });

  it('should return "stdin" kind with text and no fragments when stdin is provided', async () => {
    expect(await parseArguments([], "sample stdin")).toEqual({ kind: "stdin", text: "sample stdin", fragments: [] });
  });

  it('should return "stdin" kind with text and fragments when both stdin and --fragment are provided', async () => {
    expect(await parseArguments(["--fragment", "frag1", "--fragment", "frag2"], "sample stdin")).toEqual({
      kind: "stdin",
      text: "sample stdin",
      fragments: ["frag1", "frag2"],
    });
  });

  it('should return "file" kind with path and no fragments when --file is provided', async () => {
    expect(await parseArguments(["--file", "path/to/file"], "")).toEqual({
      kind: "file",
      path: "path/to/file",
      fragments: [],
    });
  });

  it('should return "file" kind with path and fragments when both --file and --fragment are provided', async () => {
    expect(await parseArguments(["--file", "path/to/file", "--fragment", "frag1", "--fragment", "frag2"], "")).toEqual({
      kind: "file",
      path: "path/to/file",
      fragments: ["frag1", "frag2"],
    });
  });
});
