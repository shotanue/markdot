export { metaParser };

type Token = {
  type: "tag" | "quoted" | "single-quoted" | "space" | "arg";
  value: string;
};

const tokenParser = (input: string): [Token, string] => {
  const tagMatch = input.match(/^::[^ "'`]+/);
  if (tagMatch) return [{ type: "tag", value: tagMatch[0] }, input.slice(tagMatch[0].length)];

  const quotedMatch = input.match(/^"[^"]*"/);
  if (quotedMatch) return [{ type: "quoted", value: quotedMatch[0] }, input.slice(quotedMatch[0].length)];

  const singleQuotedMatch = input.match(/^'[^']*'/);
  if (singleQuotedMatch)
    return [{ type: "single-quoted", value: singleQuotedMatch[0] }, input.slice(singleQuotedMatch[0].length)];

  const spaceMatch = input.match(/^\s+/);
  if (spaceMatch) return [{ type: "space", value: spaceMatch[0] }, input.slice(spaceMatch[0].length)];

  // If no known token is matched, skip a character and continue parsing.
  return [{ type: "space", value: input[0] }, input.slice(1)];
};

const metaParser = (input: string): Record<string, string> => {
  const tokens: Token[] = [];
  let remaining = input;

  while (remaining) {
    const parsed = tokenParser(remaining);
    tokens.push(parsed[0]);
    remaining = parsed[1];
  }

  const result: Record<string, string> = {};
  const pushResult = (val: string) => {
    const [head, tail] = val.split("=");
    result[head] = tail ?? "";
  };
  let buffer = "";
  tokens.forEach((token) => {
    if (["tag"].includes(token.type)) {
      buffer += token.value;
    } else if (["quoted", "single-quoted"].includes(token.type)) {
      const value = token.value.slice(1, token.value.length - 1);
      buffer += value;
    } else if (buffer) {
      pushResult(buffer);
      buffer = "";
    }
  });

  if (buffer) pushResult(buffer);

  return result;
};
