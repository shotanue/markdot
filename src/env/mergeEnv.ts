export { mergeEnv };

const replaceEnvVars = (str: string, env: Record<string, string | undefined>): string => {
  return str.replace(/\$([A-Z_][A-Z_0-9]*)/g, (_, varName) => env[varName] || `$${varName}`);
};

const mergeEnv = (
  a: Record<string, string | undefined>,
  b: Record<string, string | string[]>,
): Record<string, string> => {
  const result: Record<string, string> = {};

  // Combine keys from both records
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);

  for (const key of allKeys) {
    if (a[key] && b[key]) {
      const valueFromB = Array.isArray(b[key])
        ? (b[key] as string[]).map((item) => replaceEnvVars(item, a)).join(":")
        : replaceEnvVars(b[key] as string, a);

      result[key] = `${a[key]}:${valueFromB}`;
    } else if (a[key]) {
      result[key] = a[key] ?? "";
    } else {
      const valueFromB = Array.isArray(b[key])
        ? (b[key] as string[]).map((item) => replaceEnvVars(item, a)).join(":")
        : replaceEnvVars(b[key] as string, a);

      result[key] = valueFromB;
    }
  }
  return result;
};
