import { Root } from "mdast";
import remarkBreaks from "remark-breaks";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import * as TOML from "smol-toml";
import { unified } from "unified";
import flatFilter from "unist-util-flat-filter";
import YAML from "yaml";
import { Ctx, Task, Transformer } from ".";
import { argParser } from "./argParser";
import { preprocessor } from "./preprocessor";

type MakeTransformer = (ctx: Pick<Ctx, "env" | "meta">) => Transformer;

const pickPreferences = (tree: Root) => {
  const parser = {
    yaml: (value: string): Record<string, unknown> => {
      return YAML.parse(value);
    },
    toml: (value: string): Record<string, unknown> => {
      return TOML.parse(value);
    },
  };

  const node = tree.children[0];
  const nodeType = node.type as "yaml" | "node" | string;

  if (nodeType === "yaml" || nodeType === "toml") {
    return { ...parser[nodeType]("value" in node ? node.value : "") };
  }

  return {};
};

const treeToTasks = (tree: Root) => {
  const fragmentBuffer = [];
  const list: Task[] = [];
  for (const node of tree.children ?? []) {
    if (node.type === "heading") {
      if (node.children[0].type !== "text") {
        throw new Error("heading's text should be text element");
      }
      const fragment = { depth: node.depth, text: node.children[0].value };

      if (fragmentBuffer.length === 0) {
        fragmentBuffer.push(fragment);
      } else if (fragmentBuffer[fragmentBuffer.length - 1].depth === node.depth) {
        fragmentBuffer.pop();
        fragmentBuffer.push(fragment);
      } else if (fragmentBuffer[fragmentBuffer.length - 1].depth > node.depth) {
        fragmentBuffer.pop();
        fragmentBuffer.pop();
        fragmentBuffer.push(fragment);
      } else if (fragmentBuffer[fragmentBuffer.length - 1].depth < node.depth) {
        fragmentBuffer.push(fragment);
      }
    }
    if (node.type === "code") {
      const fragments = [...fragmentBuffer];
      list.push({
        kind: "codeblock",
        lang: node.lang ?? "",
        meta: argParser(node.meta ?? ""),
        code: node.value ?? "",
        fragments,
        breadcrumb: fragments.map((x) => `${"#".repeat(x.depth)} ${x.text}`).join(" > "),
      });
    }
  }
  return list;
};

const parser = unified().use(remarkParse).use(remarkBreaks).use(remarkFrontmatter, ["yaml", "toml"]).use(remarkGfm);
/*
Parsing markdown text into tree, applying some filters, and making internal data structure.
*/
export const makeTransformer: MakeTransformer = (ctx) => (input) => {
  const mdast = parser.parse(preprocessor(input.markdownText, ctx.meta, ctx.env));

  const flattenTree = flatFilter<Root>(mdast, (node) => ["code", "heading", "yaml", "toml"].includes(node.type));

  if (flattenTree === null) {
    throw new Error("tree is null");
  }

  const filterByFragments = (task: Task): boolean => {
    if (input.fragments.length === 0) {
      return true;
    }
    for (const fragment of input.fragments) {
      if (task.fragments.find((x) => x.text === fragment)) {
        return true;
      }
    }

    return false;
  };

  const excludeCodeblockWithIgnore = (task: Task): boolean => {
    if (task.kind === "codeblock" && "::ignore" in task.meta) {
      return false;
    } else {
      return true;
    }
  };

  return {
    preferences: pickPreferences(flattenTree),
    list: treeToTasks(flattenTree).filter(filterByFragments).filter(excludeCodeblockWithIgnore),
  };
};
