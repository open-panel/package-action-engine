# @open-panel/action-engine

Resolves and executes actions end-to-end for
[OpenPanel](https://github.com/open-panel/openPanel): button press →
resolve action → validate config → execute → success/failure, always with an
execution id, plus the built-in action catalog (shell, hotkeys, open app/URL,
page navigation, folders, multimedia keys, profile switching).

Requires Node — built-in actions shell out via `node:child_process`.

## Install

```bash
npm install @open-panel/action-engine
```

## What's in here

- **`ActionRegistry`** — holds every known action type (built-in and
  plugin-provided alike) keyed by `type`. `register`/`unregister`/`resolve`/`list`.
- **`ActionEngine`** — runs `ActionRegistry.resolve` → `configSchema.parse` →
  `definition.execute(ctx, config)`, with a per-execution timeout (default
  30s) and `onStarted`/`onFinished`/`onFailed` listeners. An action or plugin
  throwing is always caught and turned into a failed execution — it never
  crashes the host.
- **`ActionDefinition<TConfig>`** — the shape of one action: `type`, `name`,
  optional `configSchema` (a zod schema), and `execute(ctx, config)`.
- **`ActionContext`** — the only surface an action's `execute()` touches:
  `log`, `shell`, and (when the host wires them up) `navigateToPage`,
  `navigateRelativePage`, `switchProfile`, `enterFolder`, `exitFolder`,
  `toggleSwitch`.
- **`builtInActions`** — the MVP action catalog: `openAction`, `openUrlAction`,
  `openAppAction`, `hotkeyAction`, `hotkeySwitchAction`, `shellAction`,
  `typeTextAction`, `multimediaAction`, `changePageAction`,
  `nextPageAction`/`previousPageAction`, `switchProfileAction`,
  `openFolderAction`/`backFolderAction`, `pageIndicatorAction`.
- **`runShellCommand`** — the `node:child_process` wrapper the shell-based
  built-ins use, exposed for plugins that need the same behavior.

## Usage

```ts
import { ActionEngine, ActionRegistry, builtInActions } from "@open-panel/action-engine";

const registry = new ActionRegistry();
for (const action of builtInActions) registry.register(action);

const engine = new ActionEngine(registry, {
  navigateToPage: async (pageId) => { /* switch the active page */ },
});

engine.onFailed((error) => console.error("action failed", error));

await engine.execute({ type: "url.open", config: { url: "https://example.com" } });
```

Defining a custom action:

```ts
import { z } from "zod";
import type { ActionDefinition } from "@open-panel/action-engine";

const configSchema = z.object({ message: z.string() });

const notifyAction: ActionDefinition<z.infer<typeof configSchema>> = {
  type: "custom.notify",
  name: "Notify",
  configSchema,
  async execute(ctx, config) {
    ctx.log("info", "notifying", { message: config.message });
  },
};
```

## Related packages

- [`@open-panel/shared`](https://www.npmjs.com/package/@open-panel/shared) — the `Action`/`ActionExecution` types this package builds on
- [`@open-panel/plugin-sdk`](https://www.npmjs.com/package/@open-panel/plugin-sdk) — turns a plugin's actions into `ActionDefinition`s registered here

## License

MIT © [OpenPanel contributors](https://github.com/open-panel/package-action-engine/blob/main/LICENSE)
