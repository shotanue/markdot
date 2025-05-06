import { describe, expect, test } from "bun:test";
import { parseMarkdown } from "./parseMarkdown";

describe("parseMarkdown", () => {
  test("空のマークダウンは例外をスローしない", () => {
    expect(() => {
      parseMarkdown({ markdownText: "", fragments: [] });
    }).not.toThrow();
  });

  test("空のマークダウンは空のタスクリストを返す", () => {
    const result = parseMarkdown({ markdownText: "", fragments: [] });
    expect(result).toEqual([]);
  });

  test("コードブロックをタスクとして解析する", () => {
    const markdown = `
# タイトル

\`\`\`js
console.log("hello");
\`\`\`
`;
    const result = parseMarkdown({ markdownText: markdown, fragments: [] });
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe("codeblock");
    if (result[0].kind === "codeblock") {
      expect(result[0].lang).toBe("js");
      expect(result[0].code).toBe('console.log("hello");');
      expect(result[0].fragments).toHaveLength(1);
      expect(result[0].fragments[0].text).toBe("タイトル");
    }
  });

  test("メタ情報付きのコードブロックを解析する", () => {
    const markdown = `
# タイトル

\`\`\`js ::file=example.js
console.log("hello");
\`\`\`
`;
    const result = parseMarkdown({ markdownText: markdown, fragments: [] });
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe("codeblock");
    if (result[0].kind === "codeblock") {
      expect(result[0].meta).toEqual({ "::file": "example.js" });
    }
  });

  test("リンクからシンボリックリンクタスクを作成する", () => {
    const markdown = `
# タイトル

[リンク先](実際のパス)
`;
    const result = parseMarkdown({ markdownText: markdown, fragments: [] });
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe("createSymlink");
    if (result[0].kind === "createSymlink") {
      expect(result[0].from).toBe("実際のパス");
      expect(result[0].to).toBe("リンク先");
    }
  });

  test("画像からハードコピータスクを作成する", () => {
    const markdown = `
# タイトル

![コピー先](コピー元のパス)
`;
    const result = parseMarkdown({ markdownText: markdown, fragments: [] });
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe("createHardCopy");
    if (result[0].kind === "createHardCopy") {
      expect(result[0].from).toBe("コピー元のパス");
      expect(result[0].to).toBe("コピー先");
    }
  });

  test("複数の見出しを持つマークダウンを解析する", () => {
    const markdown = `
# 最初の見出し

\`\`\`js
console.log("first");
\`\`\`

## サブセクション

\`\`\`js
console.log("sub");
\`\`\`

# 次の見出し

\`\`\`js
console.log("next");
\`\`\`
`;
    const result = parseMarkdown({ markdownText: markdown, fragments: [] });
    expect(result).toHaveLength(3);
    expect(result[0].fragments[0].text).toBe("最初の見出し");
    expect(result[1].fragments[0].text).toBe("最初の見出し");
    expect(result[1].fragments[1].text).toBe("サブセクション");
    expect(result[2].fragments[0].text).toBe("次の見出し");
  });

  test("fragmentsでフィルタリングする", () => {
    const markdown = `
# 最初の見出し

\`\`\`js
console.log("first");
\`\`\`

# 次の見出し

\`\`\`js
console.log("next");
\`\`\`
`;
    const result = parseMarkdown({ markdownText: markdown, fragments: ["次の見出し"] });
    expect(result).toHaveLength(1);
    if (result[0].kind === "codeblock") {
      expect(result[0].code).toBe('console.log("next");');
    }
  });

  test("URLリンクはシンボリックリンクとして扱わない", () => {
    const markdown = `
# タイトル

[https://example.com](https://example.com)
`;
    const result = parseMarkdown({ markdownText: markdown, fragments: [] });
    expect(result).toHaveLength(0);
  });
});
