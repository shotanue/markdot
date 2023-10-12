import { argParser } from "./argParser";
import { describe, expect, test } from "bun:test";

describe("argParser", () => {
  describe("ignores arguments with unknown prefix", () => {
    const testCases: { input: string; expected: Record<string, string> }[] = [
      { input: "", expected: {} },
      { input: "::foo=bar", expected: { "::foo": "bar" } },
      { input: '::foo="bar"', expected: { "::foo": "bar" } },
      { input: '::foo="bar buzz"', expected: { "::foo": "bar buzz" } },
      { input: "::foo='bar'", expected: { "::foo": "bar" } },
      { input: "::foo='bar buzz'", expected: { "::foo": "bar buzz" } },
      { input: "--foo", expected: {} },
      { input: "--foo ::bar", expected: { "::bar": "" } },
      { input: "::foo --bar", expected: { "::foo": "" } },
      { input: "::foo=bar --buzz", expected: { "::foo": "bar" } },
    ];

    testCases.forEach(({ input, expected }) => {
      test(`${input}`, () => {
        expect(argParser(input)).toEqual(expected);
      });
    });
  });
});
