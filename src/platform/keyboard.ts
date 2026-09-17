import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { runPowerShell } from "./powershell.js";

const execFileAsync = promisify(execFile);

/**
 * Keyboard simulation (hotkeys + typed text) implemented by shelling out to
 * the OS's own automation tooling instead of a native npm addon. This keeps
 * `pnpm install` free of native compilation across Windows/macOS/Linux, at
 * the cost of requiring xdotool on X11 Linux (documented in the README).
 */

const MODIFIER_ALIASES: Record<string, string> = {
  CTRL: "control",
  CONTROL: "control",
  SHIFT: "shift",
  ALT: "alt",
  OPTION: "alt",
  META: "meta",
  WIN: "meta",
  CMD: "meta",
  COMMAND: "meta",
};

function normalizeKeys(keys: string[]): { modifiers: string[]; key: string } {
  const modifiers: string[] = [];
  let key = "";
  for (const raw of keys) {
    const upper = raw.trim().toUpperCase();
    if (MODIFIER_ALIASES[upper]) modifiers.push(MODIFIER_ALIASES[upper]);
    else key = raw.trim();
  }
  if (!key) throw new Error(`Hotkey config has no non-modifier key: ${keys.join("+")}`);
  return { modifiers, key };
}

export async function sendHotkey(keys: string[]): Promise<void> {
  const { modifiers, key } = normalizeKeys(keys);

  if (process.platform === "win32") {
    const sendKeysMap: Record<string, string> = { control: "^", shift: "+", alt: "%" };
    const prefix = modifiers
      .filter((m) => m !== "meta")
      .map((m) => sendKeysMap[m] ?? "")
      .join("");
    if (modifiers.includes("meta")) {
      throw new Error("The Windows key modifier is not supported via SendKeys on Windows.");
    }
    const keyToken = key.length === 1 ? key.toLowerCase() : `{${key.toUpperCase()}}`;
    const script = `Add-Type -AssemblyName System.Windows.Forms; Start-Sleep -Milliseconds 50; [System.Windows.Forms.SendKeys]::SendWait('${prefix}${keyToken}')`;
    await runPowerShell(script);
    return;
  }

  if (process.platform === "darwin") {
    const modifierList = modifiers.map((m) => `${m} down`).join(", ");
    const usingClause = modifierList ? ` using {${modifierList}}` : "";
    const script = `tell application "System Events" to keystroke "${escapeAppleScript(key.toLowerCase())}"${usingClause}`;
    await execFileAsync("osascript", ["-e", script]);
    return;
  }

  // Linux (X11)
  const combo = [...modifiers, key.toLowerCase()].join("+");
  await execFileAsync("xdotool", ["key", combo]);
}

export async function typeText(text: string): Promise<void> {
  if (process.platform === "win32") {
    const escaped = text.replace(/([+^%~(){}[\]])/g, "{$1}");
    const script = `Add-Type -AssemblyName System.Windows.Forms; Start-Sleep -Milliseconds 50; [System.Windows.Forms.SendKeys]::SendWait('${escaped.replace(/'/g, "''")}')`;
    await runPowerShell(script);
    return;
  }

  if (process.platform === "darwin") {
    const script = `tell application "System Events" to keystroke "${escapeAppleScript(text)}"`;
    await execFileAsync("osascript", ["-e", script]);
    return;
  }

  await execFileAsync("xdotool", ["type", "--", text]);
}

function escapeAppleScript(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
