// The factory: one store, one owner, the gate contract and the task kinds on top of the seam (seam-api.md). `openFactory` takes the ONE owner lock, opens the store through the
// library façade (which guards the version before anything resumes, FR-047), registers every task kind, resumes, and reports ready.
import { answers } from "./channel/client.ts";
import { channelSocketPath } from "./channel/path.ts";
import { startChannel } from "./channel/server.ts";
import { makeCommandApi } from "./commands.ts";
import { openGate } from "./gate/open.ts";
import { submitMove } from "./gate/move.ts";
import { gateState } from "./gate/state.ts";
import { Slots } from "./gate/slots.ts";
import { gateKinds } from "./gate/tasks.ts";
import { makeTaskApi, shellKinds } from "./tasks/index.ts";
import { NO_HOOKS, type Hooks } from "./hooks.ts";
import { inspectStore } from "./inspect.ts";
import { openStore } from "./library/open.ts";
import { acquireLock } from "./owner-lock.ts";
import type { Services } from "./services.ts";
import type { Report, Store, TaskKind } from "./store.ts";
import { Watch } from "./walk/watch.ts";
import { Backbone } from "./record/backbone.ts";
import type { Consumer } from "./record/consumer.ts";
import { factoryLogConsumer } from "./record/consumers/factory-log.ts";
import { archiveKind, ensureArchives } from "./record/archive-task.ts";
import { makeWalkApi, type WalkApi } from "./walk/api.ts";
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
  /** r15: consumers of the record, registered before the backbone starts (or built from the services). Tests register their own; the factory-log projection joins in US3. */
  consumers?: Consumer[] | ((s: Services) => Consumer[]);
}

export interface Factory {
  /** Resolves when waiting gates can accept moves again (FR-043). */
  readonly ready: Promise<void>;
  /** Every task parked or faulted that the library reported — must stay empty. */
  readonly reports: readonly Report[];
  readonly gates: GateApi;
  readonly tasks: TaskApi;
  readonly commands: CommandApi;
  /** r14: admit a feature, read where it is, wait for its next gate. */
  readonly walks: WalkApi;
  /** r15: delivers committed events to consumers with durable cursors. */
  readonly backbone: Backbone;
  serve(): Promise<Channel>;
  /** The store as a fresh reader sees it (read through the same file). */
  inspect(gateId?: string): Promise<Inspection>;
  close(): Promise<void>;
}

export async function openFactory(opts: FactoryOptions): Promise<Factory> {
  const hooks = opts.hooks ?? NO_HOOKS;
  await hooks.at("recover.start"); // the first step of every start: a kill HERE is a kill during recovery
  const socketPath = channelSocketPath(opts.store);
  const lock = await acquireLock(opts.store, socketPath, { probe: (info) => answers(info.socket) });
  const services: Services = { store: undefined as unknown as Store, hooks, now: opts.now ?? Date.now, slots: new Slots(), ready: false, lane: opts.lane, watch: new Watch() };
  const backbone = new Backbone(services);
  services.backbone = backbone;
  let store: Store;
  try {
    store = await openStore({ dir: opts.store, now: services.now, kinds: [...builtinKinds(services, opts.store), ...(typeof opts.tasks === "function" ? opts.tasks(services) : (opts.tasks ?? []))], installedLibraryVersion: opts.installedLibraryVersion, hooks, onAppended: () => backbone.notify() });
  } catch (e) {
    lock.release();
    throw e;
  }
  services.store = store;
  try {
    // the factory-log is a projection of the record (EVT-5): always followed, beside whatever else a caller registers. Registered before anything runs, and a refusal (a name taken, a consumer without
    // its handler, a factory function that throws) releases the store and the lock like any other failure to open.
    backbone.register(factoryLogConsumer(services, opts.store));
    for (const c of typeof opts.consumers === "function" ? opts.consumers(services) : (opts.consumers ?? [])) backbone.register(c);
  } catch (e) {
    await store.close().catch(() => {});
    lock.release();
    throw e;
  }
  store.resume();
  try {
    await opts.lane?.start?.(); // the lane task exists and no dead generation still holds the lane — before any step can ask for it
  } catch (e) {
    await store.close().catch(() => {});
    lock.release();
    throw e;
  }
  const readyPromise = converge(services, opts.readyTimeoutMs ?? 5000);
  readyPromise.catch(() => {}); // a caller that never awaits `ready` must not cause an unhandled rejection
  services.whenReady = readyPromise;
  void readyPromise.then(() => { backbone.start(); return ensureArchives(services); }, () => {}).catch(() => {}); // consumers follow the record once the factory has converged; a walk that ended without an archive gets one
  let closed = false;
  let channel: Channel | undefined;
  const gates: GateApi = { open: (key, spec) => openGate(services, key, spec), submit: (gateId, key, move) => submitMove(services, gateId, key, move), state: (gateId) => gateState(services, gateId) };
  const tasks = makeTaskApi(services);
  const walks = makeWalkApi(services, tasks);
  return {
    ready: readyPromise,
    backbone,
    reports: store.reports,
    gates,
    tasks,
    walks,
    commands: makeCommandApi(services),
    serve: async () => {
      if (channel) return channel;
      channel = await startChannel(socketPath, { ready: () => services.ready, open: gates.open, submit: gates.submit, state: gates.state, walks });
      return channel;
    },
    inspect: (gateId?: string) => inspectStore(opts.store, gateId),
    close: async () => {
      if (closed) return;
      closed = true;
      await backbone.stop(); // consumers stop first; one stuck in its own code is not waited for
      services.watch.close(); // a waiting `feature next` is released with an error: the client sees a lost connection and retries
      try {
        await channel?.close();
        await store.close();
      } finally {
        lock.release();
      }
    },
  };
}

/** The task kinds the durable core itself provides (filled in as they are built). */
function builtinKinds(services: Services, dir: string): TaskKind<any, any, any>[] {
  return [...gateKinds(services), ...shellKinds(services), archiveKind(services, dir)];
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
