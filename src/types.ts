import type { z } from "zod";
import type { LogLevel } from "@open-panel/shared";

export interface ShellResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

/**
 * Capabilities exposed to a built-in action or plugin action while it executes.
 * This is the ONLY way action code touches the outside world — it never reaches
 * into daemon internals directly (specs.md #17).
 */
export interface ActionContext {
  readonly executionId: string;
  readonly deviceId?: string;
  readonly buttonId?: string;

  log(level: LogLevel, message: string, meta?: Record<string, unknown>): void;
  shell(command: string): Promise<ShellResult>;

  /** Injected by the daemon's ProfileRuntime so the "change-page" built-in can request navigation. */
  navigateToPage?: (pageId: string) => Promise<void>;

  /**
   * Page navigation relative to whatever page the pressing device is on, for
   * the next/previous/first/last built-ins. The runtime owns "which page is
   * this device showing", so the action never has to.
   */
  navigateRelativePage?: (to: RelativePage) => Promise<void>;

  /** Makes another profile the active one, for the "profile.switch" built-in. */
  switchProfile?: (profileId: string) => Promise<void>;

  /**
   * Enters the layer of pages behind the button being pressed, for
   * "folder.open". No argument: the runtime already knows which button fired.
   */
  enterFolder?: () => Promise<void>;

  /** Leaves the current layer for the page holding its folder button, for "folder.back". */
  exitFolder?: () => Promise<void>;

  /**
   * Flips the pressed button's on/off state and reports where it landed, for
   * "hotkey.switch". Like page navigation, the action stays a thin trigger: the
   * runtime owns the state, because it is also what redraws the key to show it.
   */
  toggleSwitch?: () => Promise<boolean>;
}

/** Where a relative page navigation lands. `next`/`previous` wrap around the ends. */
export type RelativePage = "next" | "previous" | "first" | "last";

export interface ActionDefinition<TConfig = Record<string, unknown>> {
  type: string;
  name: string;
  description?: string;
  /**
   * Groups the action under a heading in the desktop's action list. Omitted
   * means "Built-in"; plugin actions are grouped by their plugin instead.
   */
  category?: string;
  /**
   * Kept out of the desktop's action list while still being executable — for
   * actions that only make sense when something else creates them (a folder's
   * own open action, which is meaningless without the folder's pages).
   */
  hidden?: boolean;
  configSchema?: z.ZodType<TConfig>;
  execute(ctx: ActionContext, config: TConfig): Promise<void>;
}
