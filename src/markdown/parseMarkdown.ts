export { parseMarkdown };

import type { Root } from "mdast";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import flatFilter from "unist-util-flat-filter";
import { metaParser } from "../markdown";
import type { Task } from "../workflow";

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
        meta: metaParser(node.meta ?? ""),
        code: node.value ?? "",
        fragments,
        breadcrumb: fragments.map((x) => `${"#".repeat(x.depth)} ${x.text}`).join(" > "),
      });
    }
  }
  return list;
};

const parseMarkdown = ({ markdownText, fragments }: { markdownText: string; fragments: string[] }) => {
  const parser = unified().use(remarkParse).use(remarkBreaks).use(remarkGfm);
  const mdast = parser.parse(markdownText);

  const flattenTree = flatFilter<Root>(mdast, (node) => ["code", "heading"].includes(node.type));

  if (flattenTree === null) {
    throw new Error("tree is null");
  }

  const filterByFragments = (task: Task): boolean => {
    if (fragments.length === 0) {
      return true;
    }
    for (const fragment of fragments) {
      if (task.fragments.find((x) => x.text === fragment)) {
        return true;
      }
    }

    return false;
  };

  return treeToTasks(flattenTree).filter(filterByFragments);
};
