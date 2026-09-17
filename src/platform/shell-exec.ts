import { exec } from "node:child_process";
import type { ShellResult } from "../types.js";

/**
 * Runs a shell command asynchronously (specs.md #28 — long-running shell
 * commands must not block the UI/daemon event loop). Never throws on a
 * non-zero exit code; the caller (built-in "shell" action) decides whether
 * that counts as failure.
 */
export function runShellCommand(command: string, timeoutMs = 30_000): Promise<ShellResult> {
  return new Promise((resolve) => {
    exec(command, { timeout: timeoutMs, windowsHide: true }, (error, stdout, stderr) => {
      resolve({
        stdout: stdout.toString(),
        stderr: stderr.toString(),
        exitCode:
          error && "code" in error
            ? (((error as NodeJS.ErrnoException).code as unknown as number) ?? 1)
            : 0,
      });
    });
  });
}
