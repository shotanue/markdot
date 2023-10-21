import { preprocessor } from "./preprocessor";
import { describe, expect, it } from "bun:test";

describe("preprocessor", () => {
  const meta = {
    hostname: "hostname",
    platform: "darwin",
    username: "username",
    arch: "amd64",
  } satisfies Parameters<typeof preprocessor>[1];

  it("can render values given as meta", () => {
    const keys = Object.keys(meta) as [keyof typeof meta];

    keys.forEach((v) => {
      expect(preprocessor(`{{meta.${v}}}`, meta, {})).toEqual(meta[v]);
    });
  });

  it("can partially remove markdown with meta parameters", () => {
    expect(preprocessor("{{#ignore}}ignored{{/ignore}}foo", meta, {})).toEqual("foo");
    expect(preprocessor("{{#platform.arch}}arch{{/platform.arch}}foo", { ...meta, platform: "arch" }, {})).toEqual(
      "archfoo",
    );
  });
});
