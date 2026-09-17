import { z } from "zod";
import { FOLDER_BACK_ACTION, FOLDER_OPEN_ACTION, PAGE_INDICATOR_ACTION } from "@open-panel/shared";
import type { ActionDefinition, RelativePage } from "../types.js";

/** The heading these appear under in the desktop's action list. */
export const PAGINATION_CATEGORY = "Pagination";

const noConfig = z.object({}).passthrough();

/**
 * Page navigation relative to the page the pressing device is currently on.
 *
 * The action deliberately knows nothing about pages: which page a device shows
 * lives in the profile runtime (ProfileRuntime#navigateRelativePage), so these
 * are thin triggers, exactly like `change-page` (specs.md #33).
 *
 * Only next/previous are exposed as actions — jumping to a specific page
 * (including the first or the last) is "Go to Page", whose picker marks them.
 * The runtime keeps the first/last moves for anything else that needs them.
 */
function relativePageAction(
  to: RelativePage,
  type: string,
  name: string,
  description: string,
): ActionDefinition<Record<string, unknown>> {
  return {
    type,
    name,
    description,
    category: PAGINATION_CATEGORY,
    configSchema: noConfig,
    async execute(ctx) {
      if (!ctx.navigateRelativePage) {
        throw new Error("Page navigation is not available in this context");
      }
      ctx.log("debug", `Navigating to the ${to} page`);
      await ctx.navigateRelativePage(to);
    },
  };
}

export const nextPageAction = relativePageAction(
  "next",
  "page.next",
  "Next Page",
  "Moves to the next page, wrapping around after the last one.",
);

export const previousPageAction = relativePageAction(
  "previous",
  "page.previous",
  "Previous Page",
  "Moves to the previous page, wrapping around before the first one.",
);

/**
 * A key that displays which page the device is on. Pressing it does nothing on
 * purpose — the value is the label, which ProfileRuntime paints as "2/3" every
 * time it renders the device.
 */
export const pageIndicatorAction: ActionDefinition<Record<string, unknown>> = {
  type: PAGE_INDICATOR_ACTION,
  name: "Page Indicator",
  description: "Shows the current page as 2/3 on the key. Does nothing when pressed.",
  category: PAGINATION_CATEGORY,
  configSchema: noConfig,
  async execute(ctx) {
    ctx.log("debug", "Page indicator pressed; nothing to do");
  },
};

const switchProfileConfig = z.object({
  profileId: z.string().min(1),
});

export const switchProfileAction: ActionDefinition<z.infer<typeof switchProfileConfig>> = {
  type: "profile.switch",
  name: "Switch Profile",
  description: "Makes another profile active and redraws the device.",
  category: PAGINATION_CATEGORY,
  configSchema: switchProfileConfig,
  async execute(ctx, config) {
    if (!ctx.switchProfile) {
      throw new Error("Profile switching is not available in this context");
    }
    ctx.log("debug", `Switching to profile ${config.profileId}`);
    await ctx.switchProfile(config.profileId);
  },
};

/**
 * A folder key. Hidden from the action list on purpose: a folder only means
 * something once it has pages behind it, which is what the profile engine's
 * `createFolder` sets up — assigning this by hand would leave a key that
 * navigates nowhere.
 */
export const openFolderAction: ActionDefinition<Record<string, unknown>> = {
  type: FOLDER_OPEN_ACTION,
  name: "Open Folder",
  description: "Enters the pages behind this key.",
  category: PAGINATION_CATEGORY,
  hidden: true,
  configSchema: noConfig,
  async execute(ctx) {
    if (!ctx.enterFolder) throw new Error("Folders are not available in this context");
    ctx.log("debug", "Entering folder");
    await ctx.enterFolder();
  },
};

export const backFolderAction: ActionDefinition<Record<string, unknown>> = {
  type: FOLDER_BACK_ACTION,
  name: "Back",
  description: "Leaves the current folder and returns to the key that opened it.",
  category: PAGINATION_CATEGORY,
  configSchema: noConfig,
  async execute(ctx) {
    if (!ctx.exitFolder) throw new Error("Folders are not available in this context");
    ctx.log("debug", "Leaving folder");
    await ctx.exitFolder();
  },
};
