import { getStdin, helpText, log, markdot, parseArguments } from "@";
import { version } from "../package.json";

try {
  const result = await parseArguments(
    process.argv.slice(2),
    await getStdin(process.stdin.isTTY, () => Bun.stdin.stream()),
  );

  if (result.kind === "version") {
    log.info(version, { label: false });
    process.exit(0);
  }

  if (result.kind === "help") {
    log.info(helpText(), { label: false });
    process.exit(2);
  }

  if (result.kind === "exit") {
    log.info(result.message, { label: false });
    process.exit(1);
  }

  const text = result.kind === "stdin" ? result.text : await Bun.file(result.path).text();

  await markdot({ markdownText: text, fragments: result.fragments });

  log.success("done");
} catch (obj) {
  console.error(obj);
  process.exit(1);
}
