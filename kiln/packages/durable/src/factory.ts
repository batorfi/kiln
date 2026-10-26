// The factory: one store, one owner, the gate contract and the task kinds on top of the seam (seam-api.md). `openFactory` takes the ONE owner lock, opens the store through the
// library façade (which guards the version before anything resumes, FR-047), registers every task kind, resumes, and reports ready.
import { channelSocketPath } from "./channel/path.ts";
import { makeCommandApi } from "./commands.ts";
import { openGate } from "./gate/open.ts";
import { submitMove } from "./gate/move.ts";
import { gateState } from "./gate/state.ts";
import { Slots } from "./gate/slots.ts";
import { gateKinds } from "./gate/tasks.ts";
import { NO_HOOKS, type Hooks } from "./hooks.ts";
import { inspectStore } from "./inspect.ts";
import { openStore } from "./library/open.ts";
import { acquireLock } from "./owner-lock.ts";
import type { Services } from "./services.ts";
import type { Report, Store, TaskKind } from "./store.ts";
import type { Channel, CommandApi, GateApi, Inspection, LaneApi, TaskApi } from "./types.ts";

export interface FactoryOptions {
  /** The store directory — one per factory. */
  store: string;
  /** The clock handed to records. A fact, never a trigger. */
  now?: () => number;
  /** TEST-ONLY injection of kill and fault points; a no-op by default. */
  hooks?: Hooks;
  /** Extra task kinds (the lane registers itself here) — or a function that builds them from the factory's services. A kind with the name of a built-in replaces it (tests use this for a deliberately broken gate). */
  tasks?: TaskKind<any, any, any>[] | ((services: Services) => TaskKind<any, any, any>[]);
  /** The lane port: implemented in packages/lane, injected here (durable cannot import lane). */
  lane?: LaneApi;
  /** How long start-up may take before the owner says it is not ready instead of claiming to be (FR-043). Default 5000 ms. */
  readyTimeoutMs?: number;
  /** TESTS ONLY: overrides the installed library version used by the store-version guard (FR-047). There is no environment variable. */
  installedLibraryVersion?: string;
}

export interface Factory {
  /** Resolves when waiting gates can accept moves again (FR-043). */
  readonly ready: Promise<void>;
  /** Every task parked or faulted that the library reported — must stay empty. */
  readonly reports: readonly Report[];
  readonly gates: GateApi;
  readonly tasks: TaskApi;
  readonly commands: CommandApi;
  serve(): Promise<Channel>;
  /** The store as a fresh reader sees it (read through the same file). */
  inspect(gateId?: string): Promise<Inspection>;
  close(): Promise<void>;
}

const notYet = (what: string) => (): never => {
  throw new Error(`${what} is not implemented yet`);
};

export async function openFactory(opts: FactoryOptions): Promise<Factory> {
  const hooks = opts.hooks ?? NO_HOOKS;
  await hooks.at("recover.start"); // the first step of every start: a kill HERE is a kill during recovery
  const lock = await acquireLock(opts.store, channelSocketPath(opts.store));
  const services: Services = { store: undefined as unknown as Store, hooks, now: opts.now ?? Date.now, slots: new Slots(), ready: false, lane: opts.lane };
  let store: Store;
  try {
    store = await openStore({ dir: opts.store, now: services.now, kinds: [...builtinKinds(services), ...(typeof opts.tasks === "function" ? opts.tasks(services) : (opts.tasks ?? []))], installedLibraryVersion: opts.installedLibraryVersion });
  } catch (e) {
    lock.release();
    throw e;
  }
  services.store = store;
  store.resume();
  const readyPromise = converge(services, opts.readyTimeoutMs ?? 5000);
  readyPromise.catch(() => {}); // a caller that never awaits `ready` must not cause an unhandled rejection
  let closed = false;
  return {
    ready: readyPromise,
    reports: store.reports,
    gates: { open: (key, spec) => openGate(services, key, spec), submit: (gateId, key, move) => submitMove(services, gateId, key, move), state: (gateId) => gateState(services, gateId) } as GateApi,
    tasks: { create: notYet("tasks.create"), list: notYet("tasks.list") } as unknown as TaskApi,
    commands: makeCommandApi(services),
    serve: notYet("serve") as unknown as () => Promise<Channel>,
    inspect: (gateId?: string) => inspectStore(opts.store, gateId),
    close: async () => {
      if (closed) return;
      closed = true;
      try {
        await store.close();
      } finally {
        lock.release();
      }
    },
  };
}

/** The task kinds the durable core itself provides (filled in as they are built). */
function builtinKinds(services: Services): TaskKind<any, any, any>[] {
  return [...gateKinds(services)];
}

/**
 * `ready` (FR-043, research R13): every live decision step has RE-REGISTERED its slot and no gate task is ready or running, so a waiting gate can accept a move. This is the one internal
 * wait of the core — bounded, not a surface, and it settles nothing. If it does not hold within `timeoutMs` the owner does NOT claim to be ready: `ready` rejects and mutating calls keep
 * answering `not-ready`.
 */
async function converge(s: Services, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const decisions = (await s.store.tasks({ kind: "kiln.decision" })).filter((t) => t.status !== "terminal");
    const allRegistered = decisions.every((t) => s.slots.get((t.input as { gateId: string }).gateId)?.registered);
    const busy = (await s.store.live()).some((t) => t.state === "ready" || (t.state === "running" && t.kind === "kiln.gate"));
    if (allRegistered && !busy) {
      s.ready = true;
      return;
    }
    if (Date.now() > deadline) throw new Error(`the owner is not ready after ${timeoutMs} ms: ${decisions.filter((t) => !s.slots.get((t.input as { gateId: string }).gateId)?.registered).length} decision step(s) have not re-registered`);
    await new Promise((r) => setTimeout(r, 20));
  }
}
