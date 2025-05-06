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

    const fragments = [...fragmentBuffer];
    if (node.type === "code") {
      list.push({
        kind: "codeblock",
        lang: node.lang ?? "",
        meta: metaParser(node.meta ?? ""),
        code: node.value ?? "",
        fragments,
        breadcrumb: fragments.map((x) => `${"#".repeat(x.depth)} ${x.text}`).join(" > "),
      });
    }
    if (node.type === "link") {
      const firstChildren = node.children[0];
      if (firstChildren.type !== "text") {
        throw new Error("link value must be text node");
      }
      // skip url text without `[]()` syntax
      if (node.url !== firstChildren.value) {
        list.push({
          kind: "createSymlink",
          from: node.url,
          to: firstChildren.value,
          fragments,
        });
      }
    }

    if (node.type === "image") {
      const to = node.alt ?? "";
      const from = node.url ?? "";

      if (to === "" || from === "") {
        throw new Error("image value must be text node");
      }
      list.push({
        kind: "createHardCopy",
        from,
        to,
        fragments,
      });
    }
  }
  return list;
};

const parseMarkdown = ({ markdownText, fragments }: { markdownText: string; fragments: string[] }) => {
  if (!markdownText.trim()) {
    return [];
  }

  const parser = unified().use(remarkParse).use(remarkBreaks).use(remarkGfm);
  const mdast = parser.parse(markdownText);

  const flattenTree = flatFilter<Root>(mdast, (node) => {
    return ["code", "heading", "link", "image"].includes(node.type);
  });

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
