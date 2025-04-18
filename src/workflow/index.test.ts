import { describe, expect, it } from "bun:test";
import { type Actor, type AnyActorLogic, createActor, fromPromise } from "xstate";
import { machine } from ".";

import bash from "@examples/codeblock-execution/bash.md";
import brewfile from "@examples/codeblock-execution/brewfile.md";
import evaluationOrder from "@examples/codeblock-execution/evaluation-order.md";
import createSymlink from "@examples/symlink/create-symlink.md";
import args from "@examples/tag/args.md";
import ignore from "@examples/tag/ignore.md";
import to from "@examples/tag/to.md";

const run = (actor: Actor<AnyActorLogic>, args: { markdownText: string; fragments: string[] }) => {
  return new Promise((resolve, reject) => {
    actor.subscribe({
      complete: () => resolve({}),
      error: reject,
    });

    actor.start().send({ type: "run", params: args });
  });
};
const read = async (path: string) => await Bun.file(path).text();

const provideTestDeps = (m: typeof machine) => {
  return m.provide({
    actors: {
      executeShellScript: fromPromise(async () => {
        return new Promise((resolve) => {
          resolve();
        });
      }),
      executeBrewfile: fromPromise(async () => {
        return new Promise((resolve) => {
          resolve();
        });
      }),
      copyCodeBlock: fromPromise(async () => {
        return new Promise((resolve) => {
          resolve();
        });
      }),
      ignoreTask: fromPromise(async () => {
        return new Promise((resolve) => {
          resolve();
        });
      }),
      createSymlink: fromPromise(async () => {
        return new Promise((resolve) => {
          resolve();
        });
      }),
    },
  });
};

describe("workflow", () => {
  it("evaluates codeblock in sequence", async () => {
    const actor = createActor(provideTestDeps(machine));

    await run(actor, {
      markdownText: await read(evaluationOrder),
      fragments: [],
    });

    const { context } = actor.getSnapshot();

    expect(context.tasks).toHaveLength(0);
    expect(context.history).toHaveLength(4);
    [
      ["a", "bash"],
      ["b", "bash"],
      ["c", "bash"],
      ["d", "brewfile"],
    ].forEach(([text, lang], i) => {
      const history = context.history[i];
      if (history.kind !== "codeblock") {
        throw new Error("must be codeblock");
      }
      expect(history.fragments[1].text).toBe(text);
      expect(history.lang).toBe(lang);
    });
  });
});

describe("shell exec", () => {
  it("can run bash", async () => {
    const actor = createActor(provideTestDeps(machine));
    await run(actor, {
      markdownText: await read(bash),
      fragments: [],
    });

    const { context } = actor.getSnapshot();

    expect(context.tasks).toHaveLength(0);
    expect(context.history).toHaveLength(3);
    expect(context.history[0]).toEqual({
      lang: "bash",
      breadcrumb: "# shell exec > ## bash",
      code: "echo foo",
      fragments: [
        { depth: 1, text: "shell exec" },
        { depth: 2, text: "bash" },
      ],
      kind: "codeblock",
      meta: {},
    });
  });
});

describe("brewfile", () => {
  it("can evaluate brewfile", async () => {
    const actor = createActor(provideTestDeps(machine));

    await run(actor, {
      markdownText: await read(brewfile),
      fragments: [],
    });

    const { context } = actor.getSnapshot();

    if (context.history[0].kind !== "codeblock" || context.history[1].kind !== "codeblock") {
      throw new Error("must be codeblock");
    }
    expect(context.history[0].lang).toBe("brewfile");
    expect(context.history[0].code).toBe(['brew "git"', 'brew "mise"'].join("\n"));

    expect(context.history[1].lang).toBe("brewfile");
    expect(context.history[1].meta).toEqual({ "::args": "--verbose --no-lock" });
  });
});

describe("::ignore", () => {
  it("can ignore codeblock to run", async () => {
    const actor = createActor(provideTestDeps(machine));

    await run(actor, {
      markdownText: await read(ignore),
      fragments: [],
    });

    const { context } = actor.getSnapshot();

    if (context.history[0].kind !== "codeblock") {
      throw new Error("must be codeblock");
    }
    expect(context.history[0].lang).toBe("sh");
  });
});

describe("::to", () => {
  it("can copy codeblock content to given path", async () => {
    const actor = createActor(provideTestDeps(machine));

    await run(actor, {
      markdownText: await read(to),
      fragments: [],
    });

    const { context } = actor.getSnapshot();

    if (context.history[0].kind !== "codeblock") {
      throw new Error("must be codeblock");
    }
    expect(context.history[0].lang).toBe("toml");
    expect(context.history[0].meta).toEqual({ "::to": "~/.config/markdot-test/sample.toml" });
  });

  it("just copy without codeblock execusion", async () => {
    const actor = createActor(provideTestDeps(machine));

    await run(actor, {
      markdownText: await read(to),
      fragments: [],
    });

    const { context } = actor.getSnapshot();

    if (context.history[1].kind !== "codeblock") {
      throw new Error("must be codeblock");
    }
    expect(context.history[1].lang).toBe("sh");
    expect(context.history[1].meta).toEqual({ "::to": "~/.config/markdot-test/sample.sh", "::permission": "755" });
  });
});

describe("::args", () => {
  it("can give argument to command", async () => {
    const actor = createActor(provideTestDeps(machine));

    await run(actor, {
      markdownText: await read(args),
      fragments: [],
    });

    const { context } = actor.getSnapshot();

    if (context.history[0].kind !== "codeblock") {
      throw new Error("must be codeblock");
    }
    expect(context.history[0].lang).toBe("brewfile");
    expect(context.history[0].meta).toEqual({ "::args": "--verbose --no-lock" });
  });
});

describe("create symlink", () => {
  it("can create symlink", async () => {
    const actor = createActor(provideTestDeps(machine));

    await run(actor, {
      markdownText: await read(createSymlink),
      fragments: [],
    });

    const { context } = actor.getSnapshot();

    if (context.history[0].kind !== "createSymlink") {
      throw new Error("must be hyperlink");
    }
    expect(context.history[0].from).toBe("~/Library/Application\\ Support/nushell");
    expect(context.history[0].to).toBe("~/.config/nushell");
  });
});
