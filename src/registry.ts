import type { ActionDefinition } from "./types.js";

/**
 * Holds every known action type — built-ins and plugin-provided alike. The
 * action engine never special-cases a type string; it only ever calls through
 * this registry (specs.md Rule 3, applied to actions as well as devices).
 *
 * `any` here (specs.md Rule 4) is deliberate: this map is heterogeneous by
 * design — each `ActionDefinition<TConfig>` has its own, unrelated config
 * type, validated by its own `configSchema` at call time in
 * `ActionEngine.execute`. A registry keyed by `unknown` would just push an
 * unsound cast to every call site instead of removing one.
 */
export class ActionRegistry {
  private readonly definitions = new Map<string, ActionDefinition<any>>();

  register(definition: ActionDefinition<any>): void {
    if (this.definitions.has(definition.type)) {
      throw new Error(`Action type already registered: ${definition.type}`);
    }
    this.definitions.set(definition.type, definition);
  }

  unregister(type: string): void {
    this.definitions.delete(type);
  }

  resolve(type: string): ActionDefinition<any> | undefined {
    return this.definitions.get(type);
  }

  list(): ActionDefinition<any>[] {
    return [...this.definitions.values()];
  }
}
