import { describe, expect, it } from "bun:test";
import bash from "@examples/codeblock-execution/bash.md";
import brewfile from "@examples/codeblock-execution/brewfile.md";
import evaluationOrder from "@examples/codeblock-execution/evaluation-order.md";
import createSymlink from "@examples/symlink/create-symlink.md";
import ignore from "@examples/tag/ignore.md";
import to from "@examples/tag/to.md";
import { scheduleTasks } from ".";

const read = async (path: string) => await Bun.file(path).text();

describe("workflow", () => {
  it("evaluates codeblock in sequence", async () => {
    const scheduledTasks = scheduleTasks({
      markdownText: await read(evaluationOrder),
      fragments: [],
    });

    expect(scheduledTasks).toHaveLength(4);

    expect(scheduledTasks[0]).toEqual({
      kind: "executeShellScript",
      info: {
        code: "echo a",
        lang: "bash",
      },
      run: expect.any(Function),
    });

    expect(scheduledTasks[1]).toEqual({
      kind: "executeShellScript",
      info: {
        code: "echo b",
        lang: "bash",
      },
      run: expect.any(Function),
    });

    expect(scheduledTasks[2]).toEqual({
      kind: "executeShellScript",
      info: {
        code: "echo c",
        lang: "bash",
      },
      run: expect.any(Function),
    });

    expect(scheduledTasks[3]).toEqual({
      kind: "executeBrewfile",
      info: {
        brew: {
          brewfile: 'brew "git"',
          args: "",
        },
      },
      run: expect.any(Function),
    });
  });
});

describe("shell exec", () => {
  it("can run bash", async () => {
    const scheduledTasks = scheduleTasks({
      markdownText: await read(bash),
      fragments: [],
    });

    expect(scheduledTasks.length).toBeGreaterThanOrEqual(1);
    const firstTask = scheduledTasks[0];
    if (firstTask.kind !== "executeShellScript") {
      throw new Error("Expected first task to be executeShellScript");
    }

    expect(firstTask.info.lang).toBe("bash");
    expect(firstTask.info.code).toBe("echo foo");
  });
});

describe("brewfile", () => {
  it("can evaluate brewfile", async () => {
    const scheduledTasks = scheduleTasks({
      markdownText: await read(brewfile),
      fragments: [],
    });

    // brewfile.md seems to have at least two brewfile blocks
    expect(scheduledTasks.length).toBeGreaterThanOrEqual(2);

    expect(scheduledTasks[0]).toEqual({
      kind: "executeBrewfile",
      info: {
        brew: {
          brewfile: 'brew "git"\nbrew "mise"',
          args: "",
        },
      },
      run: expect.any(Function),
    });

    expect(scheduledTasks[1]).toEqual({
      kind: "executeBrewfile",
      info: {
        brew: {
          brewfile: 'brew "git"',
          args: "--verbose --no-lock",
        },
      },
      run: expect.any(Function),
    });
  });
});

describe("::ignore", () => {
  it("can ignore codeblock to run", async () => {
    const scheduledTasks = scheduleTasks({
      markdownText: await read(ignore),
      fragments: [],
    });

    expect(scheduledTasks).toHaveLength(0);
  });
});

describe("::to", () => {
  it("can copy codeblock content to given path", async () => {
    const scheduledTasks = scheduleTasks({
      markdownText: await read(to),
      fragments: [],
    });

    expect(scheduledTasks.length).toBeGreaterThanOrEqual(1);
    const firstCopyTask = scheduledTasks[0];

    if (firstCopyTask.kind !== "copyCodeBlock") {
      throw new Error("Expected first task to be copyCodeBlock for toml");
    }
    expect(firstCopyTask.info.to).toBe("~/.config/markdot-test/sample.toml");
  });

  it("just copy without codeblock execusion for a specific task", async () => {
    const scheduledTasks = scheduleTasks({
      markdownText: await read(to),
      fragments: [],
    });

    expect(scheduledTasks.length).toBeGreaterThanOrEqual(2); // At least copy_toml, copy_sh
    const shCopyTask = scheduledTasks[1]; // This should be the copyCodeBlock for the 'sh' block

    if (shCopyTask.kind !== "copyCodeBlock") {
      throw new Error("Expected second scheduled actor to be copyCodeBlock for sh");
    }
    expect(shCopyTask.info.to).toBe("~/.config/markdot-test/sample.sh");
    expect(shCopyTask.info.permission).toBe(0o755); // 0o755 (octal) is 493 (decimal)
  });
});

describe("create symlink", () => {
  it("can create symlink", async () => {
    const scheduledTasks = scheduleTasks({
      markdownText: await read(createSymlink),
      fragments: [],
    });

    expect(scheduledTasks).toHaveLength(1);
    const task = scheduledTasks[0];

    if (task.kind !== "createSymlink") {
      throw new Error("Expected task to be createSymlink");
    }
    expect(task.info.from).toBe("~/.config/nushell");
    expect(task.info.to).toBe("~/Library/Application\\ Support/nushell");
  });
});
