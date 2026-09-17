import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ActionEngine } from "./engine.js";
import { ActionRegistry } from "./registry.js";
import type { ActionDefinition } from "./types.js";

function buildRegistry(): ActionRegistry {
  const registry = new ActionRegistry();
  const echo: ActionDefinition<{ value: string }> = {
    type: "test.echo",
    name: "Echo",
    configSchema: z.object({ value: z.string() }),
    async execute(ctx, config) {
      ctx.log("info", `echo:${config.value}`);
    },
  };
  const boom: ActionDefinition<Record<string, never>> = {
    type: "test.boom",
    name: "Boom",
    async execute() {
      throw new Error("kaboom");
    },
  };
  const hang: ActionDefinition<Record<string, never>> = {
    type: "test.hang",
    name: "Hang",
    async execute() {
      await new Promise(() => {});
    },
  };
  registry.register(echo);
  registry.register(boom);
  registry.register(hang);
  return registry;
}

describe("ActionEngine", () => {
  it("resolves, validates and executes an action, assigning an execution id", async () => {
    const engine = new ActionEngine(buildRegistry());
    const result = await engine.execute({ type: "test.echo", config: { value: "hi" } });
    expect(result.status).toBe("succeeded");
    expect(result.executionId).toBeTruthy();
  });

  it("emits started/finished lifecycle events", async () => {
    const engine = new ActionEngine(buildRegistry());
    const started = vi.fn();
    const finished = vi.fn();
    engine.onStarted(started);
    engine.onFinished(finished);

    await engine.execute({ type: "test.echo", config: { value: "hi" } });

    expect(started).toHaveBeenCalledOnce();
    expect(finished).toHaveBeenCalledOnce();
    expect(finished.mock.calls[0]![0].status).toBe("succeeded");
  });

  it("fails gracefully (does not throw) when the action implementation throws", async () => {
    const engine = new ActionEngine(buildRegistry());
    const failed = vi.fn();
    engine.onFailed(failed);

    const result = await engine.execute({ type: "test.boom", config: {} });

    expect(result.status).toBe("failed");
    expect(failed).toHaveBeenCalledOnce();
    expect(failed.mock.calls[0]![0].message).toContain("kaboom");
  });

  it("fails gracefully when the action type is unknown", async () => {
    const engine = new ActionEngine(buildRegistry());
    const result = await engine.execute({ type: "does-not-exist", config: {} });
    expect(result.status).toBe("failed");
  });

  it("fails gracefully when config validation fails", async () => {
    const engine = new ActionEngine(buildRegistry());
    const result = await engine.execute({ type: "test.echo", config: { value: 5 } });
    expect(result.status).toBe("failed");
  });

  it("times out a hanging action instead of blocking forever", async () => {
    const engine = new ActionEngine(buildRegistry(), { executionTimeoutMs: 20 });
    const result = await engine.execute({ type: "test.hang", config: {} });
    expect(result.status).toBe("failed");
  });

  it("delegates change-page to the injected navigateToPage callback", async () => {
    const registry = new ActionRegistry();
    const { changePageAction } = await import("./built-ins/change-page.js");
    registry.register(changePageAction);
    const navigateToPage = vi.fn().mockResolvedValue(undefined);
    const engine = new ActionEngine(registry, { navigateToPage });

    const result = await engine.execute(
      { type: "change-page", config: { pageId: "main" } },
      { deviceId: "d1", buttonId: "b1" },
    );

    expect(result.status).toBe("succeeded");
    expect(navigateToPage).toHaveBeenCalledWith("main", { deviceId: "d1", buttonId: "b1" });
  });
});
