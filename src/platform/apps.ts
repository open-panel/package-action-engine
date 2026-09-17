import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Quits a running application. The counterpart to the `open` package that
 * `open-app` uses, which has no "close" — so this shells out to each OS's own
 * process tooling, matching how `keyboard.ts` and `media.ts` work.
 *
 * `target` is whatever the user typed for "Open Application": a bare name
 * ("chrome"), an executable ("chrome.exe") or a full path — all three reduce to
 * the same process name here, so a key pair that opens and closes an app can be
 * configured with the same string.
 */
export async function closeApp(target: string, force = false): Promise<void> {
  const name = processName(target);
  if (!name) throw new Error("No application to close.");

  if (process.platform === "win32") {
    const image = /\.exe$/i.test(name) ? name : `${name}.exe`;
    const args = ["/IM", image];
    if (force) args.push("/F");
    await execFileAsync("taskkill", args);
    return;
  }

  if (process.platform === "darwin") {
    if (force) {
      await execFileAsync("pkill", ["-9", "-x", name]);
      return;
    }
    // A graceful quit, so the app gets to save and close its windows itself.
    const escaped = name.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    await execFileAsync("osascript", ["-e", `tell application "${escaped}" to quit`]);
    return;
  }

  // Linux: SIGTERM first, so the app can shut down cleanly.
  await execFileAsync("pkill", force ? ["-9", "-x", name] : ["-x", name]);
}

/** "C:\\Program Files\\App\\app.exe" and "/Applications/Safari.app" both reduce to the process name. */
function processName(target: string): string {
  const segments = target
    .trim()
    .replace(/[\\/]+$/, "")
    .split(/[\\/]/);
  // Not node:path's basename: a Windows-style path has to split the same way
  // when the daemon runs on macOS or Linux, since either can be typed here.
  return (segments[segments.length - 1] ?? "").replace(/\.app$/i, "");
}
