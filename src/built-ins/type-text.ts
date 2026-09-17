import { z } from "zod";
import type { ActionDefinition } from "../types.js";
import { typeText } from "../platform/keyboard.js";
import { SYSTEM_CATEGORY } from "./system.js";

const configSchema = z.object({
  text: z.string(),
});

export const typeTextAction: ActionDefinition<z.infer<typeof configSchema>> = {
  type: "type-text",
  name: "Text",
  description: "Types literal text as if from the keyboard.",
  category: SYSTEM_CATEGORY,
  configSchema,
  async execute(ctx, config) {
    ctx.log("debug", `Typing ${config.text.length} characters`);
    await typeText(config.text);
  },
};
