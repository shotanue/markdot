export { mergeEnv };

type MergeEnv = (args: {
  a: Record<string, string | undefined>;
  append: Record<string, string>;
  override: Record<string, string>;
}) => Record<string, string>;

const mergeEnv: MergeEnv = ({ a, append, override }): Record<string, string> => {
  // Combine keys from both records
  const allKeys = new Set([...Object.keys(a), ...Object.keys(append), ...Object.keys(override)]);

  const result: Record<string, string> = {};
  for (const key of allKeys) {
    if (override[key]) {
      result[key] = override[key];
    } else if (a[key] && append[key]) {
      result[key] = `${a[key]}:${append[key]}`;
    } else if (a[key]) {
      result[key] = a[key] ?? "";
    } else if (append[key]) {
      result[key] = append[key];
    }
  }
  return result;
};
