import { randomUUID } from "node:crypto";
import type { Action, ActionError, ActionExecution, LogLevel } from "@open-panel/shared";
import type { ActionRegistry } from "./registry.js";
import type { ActionContext, RelativePage, ShellResult } from "./types.js";
import { runShellCommand } from "./platform/shell-exec.js";

export interface Disposable {
  dispose(): void;
}

export interface ActionEngineOptions {
  /** Hard cap per execution, in ms. Prevents one runaway action from piling up resources. Default 30s. */
  executionTimeoutMs?: number;
  logger?: {
    log(level: LogLevel, event: string, meta?: Record<string, unknown>): void;
  };
  navigateToPage?: (
    pageId: string,
    meta: { deviceId?: string; buttonId?: string },
  ) => Promise<void>;
  navigateRelativePage?: (
    to: RelativePage,
    meta: { deviceId?: string; buttonId?: string },
  ) => Promise<void>;
  switchProfile?: (
    profileId: string,
    meta: { deviceId?: string; buttonId?: string },
  ) => Promise<void>;
  enterFolder?: (meta: { deviceId?: string; buttonId?: string }) => Promise<void>;
  exitFolder?: (meta: { deviceId?: string; buttonId?: string }) => Promise<void>;
  toggleSwitch?: (meta: { deviceId?: string; buttonId?: string }) => Promise<boolean>;
}

type Listener<T> = (payload: T) => void;

/**
 * Resolves and executes actions end-to-end (specs.md #15):
 * Button Press -> Resolve Action -> Validate Config -> Execute -> Success/Failure.
 *
 * An action or plugin throwing MUST NOT crash the daemon — every failure is
 * caught here and surfaced as an `actionFailed` event (specs.md Rule 6).
 */
export class ActionEngine {
  private readonly startedListeners = new Set<Listener<ActionExecution>>();
  private readonly finishedListeners = new Set<Listener<ActionExecution>>();
  private readonly failedListeners = new Set<Listener<ActionError>>();

  constructor(
    private readonly registry: ActionRegistry,
    private readonly options: ActionEngineOptions = {},
  ) {}

  onStarted(listener: Listener<ActionExecution>): Disposable {
    this.startedListeners.add(listener);
    return { dispose: () => this.startedListeners.delete(listener) };
  }

  onFinished(listener: Listener<ActionExecution>): Disposable {
    this.finishedListeners.add(listener);
    return { dispose: () => this.finishedListeners.delete(listener) };
  }

  onFailed(listener: Listener<ActionError>): Disposable {
    this.failedListeners.add(listener);
    return { dispose: () => this.failedListeners.delete(listener) };
  }

  async execute(
    action: Action,
    meta: { deviceId?: string; buttonId?: string } = {},
  ): Promise<ActionExecution> {
    const executionId = randomUUID();
    const startedAt = Date.now();
    const running: ActionExecution = {
      executionId,
      actionType: action.type,
      deviceId: meta.deviceId,
      buttonId: meta.buttonId,
      startedAt,
      status: "running",
    };
    this.emitStarted(running);
    this.log("info", "action.started", { executionId, actionType: action.type, ...meta });

    try {
      const definition = this.registry.resolve(action.type);
      if (!definition) throw new Error(`Unknown action type: ${action.type}`);

      const config = definition.configSchema
        ? definition.configSchema.parse(action.config)
        : action.config;

      const ctx: ActionContext = {
        executionId,
        deviceId: meta.deviceId,
        buttonId: meta.buttonId,
        log: (level, message, logMeta) =>
          this.log(level, "action.log", { executionId, message, ...logMeta }),
        shell: (command): Promise<ShellResult> => runShellCommand(command),
        navigateToPage: this.options.navigateToPage
          ? (pageId: string) => this.options.navigateToPage!(pageId, meta)
          : undefined,
        navigateRelativePage: this.options.navigateRelativePage
          ? (to: RelativePage) => this.options.navigateRelativePage!(to, meta)
          : undefined,
        switchProfile: this.options.switchProfile
          ? (profileId: string) => this.options.switchProfile!(profileId, meta)
          : undefined,
        enterFolder: this.options.enterFolder ? () => this.options.enterFolder!(meta) : undefined,
        exitFolder: this.options.exitFolder ? () => this.options.exitFolder!(meta) : undefined,
        toggleSwitch: this.options.toggleSwitch
          ? () => this.options.toggleSwitch!(meta)
          : undefined,
      };

      await this.withTimeout(
        definition.execute(ctx, config),
        this.options.executionTimeoutMs ?? 30_000,
      );

      const finished: ActionExecution = { ...running, status: "succeeded", finishedAt: Date.now() };
      this.emitFinished(finished);
      this.log("info", "action.finished", { executionId, actionType: action.type });
      return finished;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const failed: ActionExecution = { ...running, status: "failed", finishedAt: Date.now() };
      this.emitFinished(failed);
      this.emitFailed({ executionId, actionType: action.type, message });
      this.log("error", "action.failed", { executionId, actionType: action.type, error: message });
      return failed;
    }
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`Action timed out after ${timeoutMs}ms`)),
        timeoutMs,
      );
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      clearTimeout(timer!);
    }
  }

  private log(level: LogLevel, event: string, meta?: Record<string, unknown>): void {
    this.options.logger?.log(level, event, meta);
  }

  private emitStarted(payload: ActionExecution): void {
    for (const l of this.startedListeners) l(payload);
  }
  private emitFinished(payload: ActionExecution): void {
    for (const l of this.finishedListeners) l(payload);
  }
  private emitFailed(payload: ActionError): void {
    for (const l of this.failedListeners) l(payload);
  }
}
