import { z } from "zod";
import type { ActionDefinition } from "../types.js";
import { PAGINATION_CATEGORY } from "./pagination.js";

const configSchema = z.object({
  pageId: z.string().min(1),
});

/**
 * Delegates to `ctx.navigateToPage`, injected by the daemon's ProfileRuntime.
 * The action engine itself has no notion of "pages" — that stays in
 * profile-engine/core, keeping this action a thin trigger (specs.md #33).
 */
export const changePageAction: ActionDefinition<z.infer<typeof configSchema>> = {
  type: "change-page",
  name: "Go to Page",
  description: "Switches the device to a specific page.",
  category: PAGINATION_CATEGORY,
  configSchema,
  async execute(ctx, config) {
    if (!ctx.navigateToPage) {
      throw new Error("Page navigation is not available in this context");
    }
    await ctx.navigateToPage(config.pageId);
  },
};
