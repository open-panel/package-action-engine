import { z } from "zod";
import { openApp } from "open";
import type { ActionDefinition } from "../types.js";
import { SYSTEM_CATEGORY } from "./system.js";

const configSchema = z.object({
  path: z.string().min(1),
  args: z.array(z.string()).optional(),
});

export const openAppAction: ActionDefinition<z.infer<typeof configSchema>> = {
  type: "open-app",
  name: "Open Application",
  description: "Launches an application by path/name.",
  category: SYSTEM_CATEGORY,
  configSchema,
  async execute(ctx, config) {
    ctx.log("debug", `Opening application ${config.path}`);
    await openApp(config.path, config.args ? { arguments: config.args } : undefined);
  },
};
