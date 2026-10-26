// What the task kinds and the APIs share inside one open factory. The store is attached after it opens; task handlers read it at run time (after open), never at definition time.
import type { Hooks } from "./hooks.ts";
import type { Store } from "./store.ts";
import type { LaneApi } from "./types.ts";

export interface Services {
  store: Store;
  hooks: Hooks;
  now: () => number;
  /** The lane port, injected by whoever composes the factory (durable cannot import lane). */
  lane?: LaneApi;
}
