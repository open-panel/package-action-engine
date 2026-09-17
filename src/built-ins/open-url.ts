import { z } from "zod";
import open from "open";
import type { ActionDefinition } from "../types.js";
import { SYSTEM_CATEGORY } from "./system.js";

// Validate external URLs where appropriate (specs.md #18): only http(s) is allowed
// so a malicious/malformed profile can't turn this into an arbitrary file/app launcher.
const configSchema = z.object({
  url: z
    .string()
    .url()
    .refine((value) => /^https?:\/\//i.test(value), {
      message: "Only http/https URLs are allowed",
    }),
});

export const openUrlAction: ActionDefinition<z.infer<typeof configSchema>> = {
  type: "open-url",
  name: "Website",
  description: "Opens a URL in the default browser.",
  category: SYSTEM_CATEGORY,
  configSchema,
  async execute(ctx, config) {
    ctx.log("debug", `Opening URL ${config.url}`);
    await open(config.url);
  },
};
