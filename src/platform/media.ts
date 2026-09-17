import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { runPowerShell } from "./powershell.js";

const execFileAsync = promisify(execFile);

/**
 * The transport/volume keys a media keyboard carries. Kept as a closed set so
 * the action's config schema and the per-platform tables below cannot drift.
 */
export const MEDIA_KEYS = [
  "play-pause",
  "next",
  "previous",
  "stop",
  "mute",
  "volume-up",
  "volume-down",
] as const;

export type MediaKey = (typeof MEDIA_KEYS)[number];

/** Windows virtual-key codes (VK_MEDIA_* / VK_VOLUME_*). */
const WINDOWS_VK: Record<MediaKey, number> = {
  "play-pause": 0xb3,
  next: 0xb0,
  previous: 0xb1,
  stop: 0xb2,
  mute: 0xad,
  "volume-up": 0xaf,
  "volume-down": 0xae,
};

/**
 * macOS NX_KEYTYPE_* subtypes, posted as a system-defined NSEvent. There is no
 * NX subtype for "stop", which is why that one entry is absent — `sendMediaKey`
 * turns the gap into a clear error instead of silently doing something else.
 */
const MAC_NX_KEY: Partial<Record<MediaKey, number>> = {
  "volume-up": 0,
  "volume-down": 1,
  mute: 7,
  "play-pause": 16,
  next: 17,
  previous: 18,
};

/** X11 keysyms, driven through xdotool like the rest of the Linux keyboard support. */
const X11_KEYSYM: Record<MediaKey, string> = {
  "play-pause": "XF86AudioPlay",
  next: "XF86AudioNext",
  previous: "XF86AudioPrev",
  stop: "XF86AudioStop",
  mute: "XF86AudioMute",
  "volume-up": "XF86AudioRaiseVolume",
  "volume-down": "XF86AudioLowerVolume",
};

/**
 * Presses a media key system-wide, so whichever app currently owns playback
 * reacts — exactly as the physical key on a keyboard would. Same trade-off as
 * `keyboard.ts`: the OS's own automation tooling rather than a native addon.
 */
export async function sendMediaKey(key: MediaKey): Promise<void> {
  if (process.platform === "win32") {
    // keybd_event with KEYEVENTF_EXTENDEDKEY (1), then + KEYEVENTF_KEYUP (2).
    const vk = WINDOWS_VK[key];
    const script = [
      `Add-Type -Namespace OpenPanel -Name Native -MemberDefinition '[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, System.UIntPtr dwExtraInfo);'`,
      `[OpenPanel.Native]::keybd_event(${vk}, 0, 1, [System.UIntPtr]::Zero)`,
      `[OpenPanel.Native]::keybd_event(${vk}, 0, 3, [System.UIntPtr]::Zero)`,
    ].join("; ");
    await runPowerShell(script);
    return;
  }

  if (process.platform === "darwin") {
    const nx = MAC_NX_KEY[key];
    if (nx === undefined) {
      throw new Error(`macOS has no media key for "${key}".`);
    }
    // JXA's ObjC bridge, because AppleScript's `key code` table has no media
    // keys: build the NSSystemDefined event by hand and post it to the session.
    const script = `ObjC.import('Cocoa');
function press(code, down) {
  var data1 = (code << 16) | ((down ? 0xa : 0xb) << 8);
  var event = $.NSEvent.otherEventWithTypeLocationModifierFlagsTimestampWindowNumberContextSubtypeData1Data2(
    14, $.NSMakePoint(0, 0), (down ? 0xa : 0xb) << 8, 0, 0, $(), 8, data1, -1);
  $.CGEventPost(0, event.CGEvent);
}
press(${nx}, true);
press(${nx}, false);`;
    await execFileAsync("osascript", ["-l", "JavaScript", "-e", script]);
    return;
  }

  // Linux (X11)
  await execFileAsync("xdotool", ["key", X11_KEYSYM[key]]);
}
