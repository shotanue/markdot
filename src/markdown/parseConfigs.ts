export { parseConfigs };

import type { Root } from "mdast";
import remarkFrontmatter from "remark-frontmatter";
import remarkParse from "remark-parse";
import * as TOML from "smol-toml";
import { unified } from "unified";
import flatFilter from "unist-util-flat-filter";
import YAML from "yaml";

const pickConfigs = (tree: Root) => {
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

const parseConfigs = ({ markdownText }: { markdownText: string }) => {
  const parser = unified().use(remarkParse).use(remarkFrontmatter, ["yaml", "toml"]);
  const mdast = parser.parse(markdownText);

  const flattenTree = flatFilter<Root>(mdast, (node) => ["yaml", "toml"].includes(node.type));

  if (flattenTree === null) {
    return {};
  }

  return pickConfigs(flattenTree);
};
