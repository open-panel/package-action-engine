import { z } from "zod";
import type { ActionDefinition } from "../types.js";

const configSchema = z.object({
  command: z.string().min(1),
});

/**
 * Shell execution is powerful and MUST be treated carefully (specs.md #18).
 * The desktop UI is responsible for clearly flagging this action type to the
 * user when editing a button; this definition just executes what it is given.
 */
export const shellAction: ActionDefinition<z.infer<typeof configSchema>> = {
  type: "shell",
  name: "Shell Command",
  description: "Executes a shell command. Capable of arbitrary system changes — use with care.",
  configSchema,
  async execute(ctx, config) {
    ctx.log("info", `Executing shell command`, { command: redact(config.command) });
    const result = await ctx.shell(config.command);
    if (result.exitCode !== 0) {
      throw new Error(
        `Command exited with code ${result.exitCode}: ${result.stderr || result.stdout}`,
      );
    }
  },
};

// Never log secrets/tokens embedded in a shell command (specs.md #18, #20).
function redact(command: string): string {
  return command.replace(/(--?(?:password|token|secret|api-?key)\s*[=: ]\s*)\S+/gi, "$1***");
}
