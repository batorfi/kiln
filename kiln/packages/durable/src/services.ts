// What the task kinds and the APIs share inside one open factory. The store is attached after it opens; task handlers read it at run time (after open), never at definition time.
import type { Slots } from "./gate/slots.ts";
import type { Watch } from "./walk/watch.ts";
import type { Hooks } from "./hooks.ts";
import type { Store } from "./store.ts";
import type { LaneApi } from "./types.ts";

export interface Services {
  store: Store;
  hooks: Hooks;
  now: () => number;
  /** True once waiting gates can accept moves again (FR-043). Until then a mutating call answers `not-ready`. */
  ready: boolean;
  /** The owner-level wait slots of the gates' decision steps (memory by design, research R2). */
  slots: Slots;
  /** The lane port, injected by whoever composes the factory (durable cannot import lane). */
  lane?: LaneApi;
  /** r14: tells a waiting `feature next` that something changed for a feature (never a source of truth; the answer is re-read from the store). */
  watch: Watch;
  /** Settles when waiting gates can take moves again (the factory's `ready`). A walk's row asks it before it uses the gate API: a step that resumes during start-up must WAIT for readiness, not fail on `not-ready`. */
  whenReady?: Promise<void>;
}
