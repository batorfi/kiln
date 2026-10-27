// The OWNER of a store, as a process would run it (FR-041, FR-045): open the factory (taking the one owner lock), serve the private channel, and report `listening` as soon as the channel is up and
// `ready` once waiting gates can accept moves. `kiln owner` is this plus signal handling. A store that is already owned is refused here with `StoreOwned`, before anything is served.
import { openFactory, type Factory, type FactoryOptions } from "./factory.ts";
import type { Channel } from "./types.ts";

export interface RunningOwner {
  factory: Factory;
  channel: Channel;
  /** Resolves when the factory is ready; rejects if it cannot become ready within its bound (FR-043). */
  ready: Promise<void>;
  /** A clean stop: closes the channel, the store and releases the lock. */
  stop(): Promise<void>;
}

export async function startOwner(opts: FactoryOptions): Promise<RunningOwner> {
  const factory = await openFactory(opts);
  let channel: Channel;
  try {
    channel = await factory.serve();
  } catch (e) {
    await factory.close().catch(() => {});
    throw e;
  }
  return { factory, channel, ready: factory.ready, stop: () => factory.close() };
}
