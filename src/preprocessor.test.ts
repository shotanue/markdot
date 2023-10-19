import { preprocessor } from "./preprocessor";
import { describe, expect, it } from "bun:test";

describe("preprocessor", () => {
  const meta = {
    hostname: "hostname",
    platform: "platform",
    username: "username",
  } satisfies Parameters<typeof preprocessor>[1];

  it("can render values given as meta", () => {
    ["hostname", "platform", "username"].forEach((v) => {
      expect(preprocessor(`{{meta.${v}}}`, meta, {})).toEqual(v);
    });
  });

  it("can partially remove markdown with meta parameters", () => {
    expect(preprocessor("{{#ignore}}ignored{{/ignore}}foo", meta, {})).toEqual("foo");
    expect(preprocessor("{{#platform.arch}}arch{{/platform.arch}}foo", { ...meta, platform: "arch" }, {})).toEqual(
      "archfoo",
    );
  });
});
