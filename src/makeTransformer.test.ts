import { makeTransformer } from "./makeTransformer";
import { describe, expect, it } from "bun:test";

describe("transformer", () => {
  const transformer = makeTransformer({
    env: {},
    meta: {
      hostname: "",
      platform: "",
      username: "",
    },
  });
  it("can parse codeblock", () => {
    expect(
      transformer({
        markdownText: `
\`\`\`bash
echo hoge
\`\`\`
        `,
        fragments: [],
      }),
    ).toEqual({
      preferences: {},
      list: [
        {
          kind: "codeblock",
          lang: "bash",
          meta: {},
          code: "echo hoge",
          fragments: [],
          breadcrumb: "",
        },
      ],
    });
  });
  it("can parse multiple codeblocks", () => {
    expect(
      transformer({
        markdownText: `
\`\`\`bash
echo hoge
\`\`\`

\`\`\`bash
echo fuga
\`\`\`
        `,
        fragments: [],
      }),
    ).toEqual({
      preferences: {},
      list: [
        {
          kind: "codeblock",
          lang: "bash",
          meta: {},
          code: "echo hoge",
          fragments: [],
          breadcrumb: "",
        },
        {
          kind: "codeblock",
          lang: "bash",
          meta: {},
          code: "echo fuga",
          fragments: [],
          breadcrumb: "",
        },
      ],
    });
  });
  it("can parse codeblock with heading", () => {
    expect(
      transformer({
        markdownText: `
# heading
\`\`\`bash
echo hoge
\`\`\`
        `,
        fragments: [],
      }),
    ).toEqual({
      preferences: {},
      list: [
        {
          kind: "codeblock",
          lang: "bash",
          meta: {},
          code: "echo hoge",
          fragments: [
            {
              depth: 1,
              text: "heading",
            },
          ],
          breadcrumb: "# heading",
        },
      ],
    });
  });

  it("can parse multiple codeblocks with heading", () => {
    expect(
      transformer({
        markdownText: `
# heading
\`\`\`bash
echo hoge
\`\`\`

# heading2
\`\`\`bash
echo fuga
\`\`\`
        `,
        fragments: [],
      }),
    ).toEqual({
      preferences: {},
      list: [
        {
          kind: "codeblock",
          lang: "bash",
          meta: {},
          code: "echo hoge",
          fragments: [
            {
              depth: 1,
              text: "heading",
            },
          ],
          breadcrumb: "# heading",
        },
        {
          kind: "codeblock",
          lang: "bash",
          meta: {},
          code: "echo fuga",
          fragments: [
            {
              depth: 1,
              text: "heading2",
            },
          ],
          breadcrumb: "# heading2",
        },
      ],
    });
  });

  it("can parse codeblock with heading", () => {
    expect(
      transformer({
        markdownText: `
# heading
## heading-heading
\`\`\`bash
echo hoge
\`\`\`
        `,
        fragments: [],
      }),
    ).toEqual({
      preferences: {},
      list: [
        {
          kind: "codeblock",
          lang: "bash",
          meta: {},
          code: "echo hoge",
          fragments: [
            {
              depth: 1,
              text: "heading",
            },
            {
              depth: 2,
              text: "heading-heading",
            },
          ],
          breadcrumb: "# heading > ## heading-heading",
        },
      ],
    });
  });

  it("can parse frontmatter written in YAML", () => {
    expect(
      transformer({
        markdownText: `---
yaml: foo
---
      `,
        fragments: [],
      }),
    ).toEqual({
      preferences: {
        yaml: "foo",
      },
      list: [],
    });
  });
  it("can parse frontmatter written in TOML", () => {
    expect(
      transformer({
        markdownText: `+++
toml="foo"

[bar]
hoge="fuga"
+++
      `,
        fragments: [],
      }),
    ).toEqual({
      preferences: {
        toml: "foo",
        bar: {
          hoge: "fuga",
        },
      },
      list: [],
    });
  });
  it("can apply fragment filter", () => {
    expect(
      transformer({
        markdownText: `
# foo
\`\`\`bash
echo foo
\`\`\`

## hoge
\`\`\`bash
echo hoge
\`\`\`

# bar
\`\`\`bash
echo bar
\`\`\`
      `,
        fragments: ["hoge"],
      }),
    ).toEqual({
      preferences: {},
      list: [
        {
          kind: "codeblock",
          lang: "bash",
          meta: {},
          code: "echo hoge",
          fragments: [
            {
              depth: 1,
              text: "foo",
            },
            {
              depth: 2,
              text: "hoge",
            },
          ],
          breadcrumb: "# foo > ## hoge",
        },
      ],
    });
  });
  it("can apply fragment filter", () => {
    expect(
      transformer({
        markdownText: `
# foo
\`\`\`bash
echo foo
\`\`\`

## bar
\`\`\`bash
echo bar
\`\`\`

# hoge
\`\`\`bash
echo hoge
\`\`\`
      `,
        fragments: ["foo"],
      }),
    ).toEqual({
      preferences: {},
      list: [
        {
          kind: "codeblock",
          lang: "bash",
          meta: {},
          code: "echo foo",
          fragments: [
            {
              depth: 1,
              text: "foo",
            },
          ],
          breadcrumb: "# foo",
        },
        {
          kind: "codeblock",
          lang: "bash",
          meta: {},
          code: "echo bar",
          fragments: [
            {
              depth: 1,
              text: "foo",
            },
            {
              depth: 2,
              text: "bar",
            },
          ],
          breadcrumb: "# foo > ## bar",
        },
      ],
    });
  });
  it("ignores node which has ::ignore", () => {
    expect(
      transformer({
        markdownText: `
# foo
\`\`\`bash ::ignore
echo foo
\`\`\`

\`\`\`bash
echo hoge
\`\`\`
        
      `,
        fragments: [],
      }),
    ).toEqual({
      preferences: {},
      list: [
        {
          kind: "codeblock",
          lang: "bash",
          meta: {},
          code: "echo hoge",
          fragments: [
            {
              depth: 1,
              text: "foo",
            },
          ],
          breadcrumb: "# foo",
        },
      ],
    });
  });
  // bun test does not seem to work, handling throw.
  it.skip("raises error if parsed tree is empty. More than 0 Codeblocks or headings are required.", () => {
    expect(
      transformer({
        markdownText: "",
        fragments: [],
      }),
    ).toThrow();
  });
});
