import { z } from "zod";
import open from "open";
import type { ActionDefinition } from "../types.js";
import { closeApp } from "../platform/apps.js";
import { MEDIA_KEYS, sendMediaKey } from "../platform/media.js";

/**
 * The heading these appear under in the desktop's action list, alongside
 * "Pagination". It collects the actions that drive the machine itself —
 * keyboard, applications, files, media — as opposed to the ones that move the
 * device between pages.
 */
export const SYSTEM_CATEGORY = "System";

const openConfig = z.object({
  path: z.string().min(1),
});

/**
 * Opens a file, folder or document with whatever the OS has registered for it.
 *
 * Unlike "Website" (specs.md #18: http/https only, because a URL can arrive
 * from anywhere), this one exists precisely to reach local paths, and the path
 * comes from the profile the user edits on this machine.
 */
export const openAction: ActionDefinition<z.infer<typeof openConfig>> = {
  type: "system.open",
  name: "Open",
  description: "Opens a file, folder or document with its default application.",
  category: SYSTEM_CATEGORY,
  configSchema: openConfig,
  async execute(ctx, config) {
    ctx.log("debug", `Opening ${config.path}`);
    await open(config.path);
  },
};

const closeConfig = z.object({
  app: z.string().min(1),
  /** Kills the process instead of asking it to quit — for an app that hangs. */
  force: z.boolean().optional(),
});

export const closeAction: ActionDefinition<z.infer<typeof closeConfig>> = {
  type: "system.close",
  name: "Close",
  description: "Quits a running application by name or path.",
  category: SYSTEM_CATEGORY,
  configSchema: closeConfig,
  async execute(ctx, config) {
    ctx.log("debug", `Closing application ${config.app}`, { force: config.force ?? false });
    await closeApp(config.app, config.force ?? false);
  },
};

const multimediaConfig = z.object({
  key: z.enum(MEDIA_KEYS),
});

/**
 * A media key press, delivered system-wide: it goes to whichever application
 * currently owns playback rather than to a configured one, which is what makes
 * a single key work across Spotify, a browser tab and a video player.
 */
export const multimediaAction: ActionDefinition<z.infer<typeof multimediaConfig>> = {
  type: "system.multimedia",
  name: "Multimedia",
  description: "Sends a media key: play/pause, next, previous, stop, mute or volume.",
  category: SYSTEM_CATEGORY,
  configSchema: multimediaConfig,
  async execute(ctx, config) {
    ctx.log("debug", `Sending media key ${config.key}`);
    await sendMediaKey(config.key);
  },
};
