import { z } from "zod";
import { HOTKEY_SWITCH_ACTION } from "@open-panel/shared";
import type { ActionDefinition } from "../types.js";
import { sendHotkey } from "../platform/keyboard.js";
import { SYSTEM_CATEGORY } from "./system.js";

const configSchema = z.object({
  keys: z.array(z.string().min(1)).min(1),
});

export const hotkeyAction: ActionDefinition<z.infer<typeof configSchema>> = {
  type: "hotkey",
  name: "Hotkey",
  description: "Sends a keyboard shortcut, e.g. CTRL+SHIFT+P.",
  category: SYSTEM_CATEGORY,
  configSchema,
  async execute(ctx, config) {
    ctx.log("debug", `Sending hotkey ${config.keys.join("+")}`);
    await sendHotkey(config.keys);
  },
};

const switchConfigSchema = z.object({
  on: z.array(z.string().min(1)).min(1),
  off: z.array(z.string().min(1)).min(1),
});

/**
 * One key that alternates between two shortcuts — press it to mute, press it
 * again to unmute. Which way it is currently flipped is not configuration, so
 * it is not stored here: `ctx.toggleSwitch` flips the runtime's per-button
 * state and reports where it landed, exactly as the page actions delegate
 * "which page is this device on" (specs.md #33). That also gets the key
 * redrawn, so the deck shows the state rather than the user having to guess.
 *
 * The state starts at "off" and resets when the daemon restarts: nothing can
 * tell us what the other application did while we were not running.
 */
export const hotkeySwitchAction: ActionDefinition<z.infer<typeof switchConfigSchema>> = {
  type: HOTKEY_SWITCH_ACTION,
  name: "Hotkey Switch",
  description: "Alternates between two shortcuts on each press, showing which one is next.",
  category: SYSTEM_CATEGORY,
  configSchema: switchConfigSchema,
  async execute(ctx, config) {
    if (!ctx.toggleSwitch) {
      throw new Error("A hotkey switch can only be used on a key that a device can press");
    }
    const switchedOn = await ctx.toggleSwitch();
    const keys = switchedOn ? config.on : config.off;
    ctx.log("debug", `Switching ${switchedOn ? "on" : "off"} with ${keys.join("+")}`);
    await sendHotkey(keys);
  },
};
