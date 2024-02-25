import { describe, expect, it } from "bun:test";
import { parseArguments } from "./parseArguments";

describe("parseArguments", () => {
  it('should return "help" kind when --help or -h is provided', async () => {
    expect(await parseArguments(["--help"], "")).toEqual({ kind: "help" });
    expect(await parseArguments(["-h"], "")).toEqual({ kind: "help" });
  });

  it('should return "stdin" kind', async () => {
    expect(await parseArguments([], "sample stdin")).toEqual({
      kind: "stdin",
      text: "sample stdin",
      fragments: [],
    });

    expect(await parseArguments(["--fragment", "frag1"], "sample stdin")).toEqual({
      kind: "stdin",
      text: "sample stdin",
      fragments: ["frag1"],
    });
  });

  it('should return "file" kind', async () => {
    expect(await parseArguments(["path/to/file"], "")).toEqual({
      kind: "file",
      path: "path/to/file",
      fragments: [],
    });

    expect(await parseArguments(["path/to/file#hash"], "")).toEqual({
      kind: "file",
      path: "path/to/file",
      fragments: ["hash"],
    });
  });
});
