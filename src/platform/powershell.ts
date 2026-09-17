import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Runs a PowerShell script on Windows without going through a shell, so the
 * script body is never re-parsed by cmd.exe. Shared by the platform modules
 * that drive the OS's own automation tooling (keyboard, media keys) instead of
 * pulling in a native addon — see the note at the top of `keyboard.ts`.
 */
export async function runPowerShell(script: string): Promise<void> {
  const encoded = Buffer.from(script, "utf16le").toString("base64");
  await execFileAsync("powershell.exe", [
    "-NoProfile",
    "-NonInteractive",
    "-EncodedCommand",
    encoded,
  ]);
}
