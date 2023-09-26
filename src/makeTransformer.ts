import { Root } from "mdast";
import { Transformer } from ".";
import { argParser } from "./argParser";

type MakeTransformer = (modules: {
  parser: {
    parse: (markdownText: string) => Root;
  };
}) => Transformer;

export const makeTransformer: MakeTransformer =
  ({ parser }) =>
  (input) => {
    const mdast = parser.parse(input.markdownText);

    return {
      preferences: {
        hyperlink: {
          type: "symlink",
        },
      },
      list: mdast.children
        .map((x) => (x.type === "code" ? x : []))
        .flatMap((x) => x)
        .map((x) => {
          return {
            lang: x.lang ?? "",
            meta: argParser(x.meta ?? ""),
            code: x.value ?? "",
            fragments: ["## mock"],
          };
        }),
    };
  };
