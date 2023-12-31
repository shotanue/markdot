import { Readable } from "stream";
import { getStdin } from "./getStdin";
import { describe, expect, it } from "bun:test";

describe("getStdin", () => {
  it("should return content from the provided stream when isTTY is false", async () => {
    const sampleData = "sample data";
    const mockStream = () => {
      const readable = new Readable();
      readable.push(sampleData);
      readable.push(null); // End of data

      return readable;
    };

    // @ts-ignore
    const result = await getStdin(false, mockStream);
    expect(result).toEqual(sampleData);
  });

  it("should return an empty string when isTTY is true", async () => {
    const mockStream = () => new Readable();
    // @ts-ignore
    const result = await getStdin(true, mockStream);
    expect(result).toEqual("");
  });
});
