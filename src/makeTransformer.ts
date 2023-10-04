import { readFileSync } from "fs";
import { Root } from "mdast";
import * as TOML from "smol-toml";
import flatFilter from "unist-util-flat-filter";
import { visit } from "unist-util-visit";
import YAML from "yaml";
import { Task, Transformer } from ".";
import { argParser } from "./argParser";

type MakeTransformer = (modules: {
  parser: {
    parse: (markdownText: string) => Root;
  };
}) => Transformer;

const pickPreferences = (tree: Root) => {
  const defaultValue = {};

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
    return { ...defaultValue, ...parser[nodeType]("value" in node ? node.value : "") };
  }

  return defaultValue;
};

const transformToTasks = (tree: Root) => {
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
      } else if (fragmentBuffer[fragmentBuffer.length - 1].depth >= node.depth) {
        fragmentBuffer.pop();
        fragmentBuffer.push(fragment);
      } else if (fragmentBuffer[fragmentBuffer.length - 1].depth < node.depth) {
        fragmentBuffer.push(fragment);
      }
    }
    if (node.type === "code") {
      list.push({
        kind: "codeblock",
        lang: node.lang ?? "",
        meta: argParser(node.meta ?? ""),
        code: node.value ?? "",
        fragments: [...fragmentBuffer],
      });
    }
    if (node.type === "link") {
      const referer = node.children[0].type === "text" ? node.children[0].value : "";
      if (referer === "") {
        throw new Error("hyperlink: referer should be text node and length must be more than 0");
      }
      list.push({
        kind: "hyperlink",
        referer: referer,
        src: node.url,
        type: "symlink",
        fragments: [...fragmentBuffer],
      });
    }
  }
  return list;
};

export const makeTransformer: MakeTransformer =
  ({ parser }) =>
  (input) => {
    const mdast = parser.parse(input.markdownText);

    const embedOtherMarkdownFiles = () => {
      visit(mdast, "image", (node, index, parent) => {
        const text = readFileSync(node.url).toString();
        if (parent && index !== undefined && "children" in parent) {
          parent.children.splice(index, 1, ...parser.parse(text).children);
        }
      });
    };

    embedOtherMarkdownFiles();

    const newTree = flatFilter<Root>(mdast, (node) => ["code", "link", "heading", "yaml", "toml"].includes(node.type));
    if (newTree === null) {
      throw new Error("tree is null");
    }

    return {
      preferences: pickPreferences(newTree),
      list: transformToTasks(newTree),
    };
  };
