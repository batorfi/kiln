// The walk's kill harness (r14 T049): run a feature's walk against a CHILD owner process, armed to die by SIGKILL at a named kill point; when it dies, start a fresh owner on the SAME store and carry on with the
// SAME keys — exactly what a person's CLI would do after a crash. Everything the driver does goes through the owner's private channel (it never opens the store); what the test JUDGES is the store as the
// crash left it, read by a fresh reader with no owner (`inspectStore`) — never the owner's memory.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ChannelError } from "#durable/types.ts";
import { connect, type ChannelClient } from "#durable/channel/client.ts";
import { channelSocketPath } from "#durable/channel/path.ts";
import { inspectStore } from "#durable/inspect.ts";
import type { Inspection, Move } from "#durable/types.ts";
import type { WalkInput } from "#durable/walk/input.ts";
import type { OpenGateView, WalkView } from "#durable/walk/view.ts";
import { killNow, makeStore, startOwner, type OwnerOptions, type OwnerRun, type TestStore } from "./harness.ts";

export const DECIDER = "script:r14";
export type Chooser = (gate: OpenGateView, n: number) => Partial<Move> | undefined;
export const approveAll: Chooser = (g) => ({ kind: "approve", ...(g.gateKey === "gate0" ? { admit: {} } : {}) });

export interface WalkRunOptions {
  feature: string;
  walk: WalkInput;
  choose?: Chooser;
  /** Arm the FIRST owner to die at this point (the n-th time it is reached). Later owners are not armed unless `rearm` says so. */
  killAt?: string;
  killNth?: number;
  /** After a death, arm the next owner too (restart storms): called with the number of deaths so far; returns the next owner's arming or undefined. */
  rearm?: (deaths: number) => { killAt: string; killNth?: number } | undefined;
  /** Extra owner options (clock offset, …). */
  owner?: OwnerOptions;
  /** Stop the drive after this many moves (the store is judged mid-walk). */
  stopAfter?: number;
  maxMs?: number;
  /** Count how many times each kill point is reached (a HIT_LOG written by the test-only owner), so a matrix knows how far to go. */
  countHits?: boolean;
}
export interface WalkRun {
  ts: TestStore;
  inspection: Inspection;
  view: WalkView;
  steps: { gateId: string; gateKey: string; round: number; kind: string; status: string }[];
  /** Kill points that actually fired, in order (from the kill log). */
  fired: string[];
  /** How many owners died during the run. */
  deaths: number;
  /** Times each kill point was reached across all owners of the run (only with `countHits`). */
  hits: Map<string, number>;
  cleanup(): void;
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export async function runWalk(o: WalkRunOptions): Promise<WalkRun> {
  const ts = makeStore();
  const sock = channelSocketPath(ts.store);
  const deadline = Date.now() + (o.maxMs ?? 120_000);
  const choose = o.choose ?? approveAll;
  const hitLog = o.countHits ? join(ts.dir, "hits.log") : undefined;
  const ownerEnv = { ...(o.owner?.env ?? {}), ...(hitLog ? { HIT_LOG: hitLog } : {}) };
  let owner: OwnerRun = await startOwner(ts, { ...o.owner, env: ownerEnv, serve: true, ...(o.killAt ? { killAt: o.killAt, killNth: o.killNth } : {}) });
  let deaths = 0;

  const alive = (): boolean => owner.proc.exitCode === null && owner.proc.signalCode === null;
  /** The owner is gone (or answering badly): wait for the death to be real, start a new one on the same store, and wait until it is READY. */
  async function recover(): Promise<void> {
    if (alive()) {
      await sleep(40);
      if (alive()) return; // a transient error: just ask again
    }
    await owner.exited;
    deaths++;
    const arm = o.rearm?.(deaths);
    owner = await startOwner(ts, { ...o.owner, env: ownerEnv, serve: true, ...(arm ? { killAt: arm.killAt, killNth: arm.killNth } : {}) });
    for (;;) {
      if (Date.now() > deadline) throw new Error("the restarted owner did not become ready");
      try {
        const c = await connect(sock, { timeoutMs: 2000 });
        try {
          if (await c.ready()) return;
        } finally {
          c.close();
        }
      } catch { /* not listening yet */ }
      await sleep(30);
    }
  }
  async function call<T>(fn: (c: ChannelClient) => Promise<T>): Promise<T> {
    for (;;) {
      if (Date.now() > deadline) throw new Error(`the walk of ${o.feature} did not finish within ${o.maxMs ?? 120_000} ms`);
      let c: ChannelClient | undefined;
      try {
        c = await connect(sock, { timeoutMs: 4000 });
        const out = await fn(c);
        const r = out as { status?: string; reason?: string; detail?: string };
        const lost = r?.status === "refused" && (r.reason === "not-ready" || (r.reason === "store-error" && ["connection-lost", "timeout"].includes(r.detail ?? "")));
        if (!lost) return out;
      } catch (e) {
        if (!(e instanceof ChannelError)) throw e;
      } finally {
        c?.close();
      }
      await recover();
      await sleep(20);
    }
  }

  const steps: WalkRun["steps"] = [];
  const admitted = await call((c) => c.admit(`admit:${o.feature}`, o.feature, o.walk));
  if (admitted.status === "refused") throw new Error(`the walk was refused: ${admitted.reason} ${admitted.detail ?? ""}`);
  let view: WalkView;
  let after: string | undefined;
  for (let n = 0; ; n++) {
    view = await call((c) => c.featureNext(o.feature, after));
    if (!view.openGate || (o.stopAfter !== undefined && steps.length >= o.stopAfter)) break;
    const g = view.openGate;
    const m = choose(g, n);
    if (!m) break;
    const key = `m:${g.gateId}`;
    const answer = await call((c) => c.submit(g.gateId, key, { kind: "approve", decidedBy: DECIDER, briefRef: g.briefRef, ...m } as Move));
    steps.push({ gateId: g.gateId, gateKey: g.gateKey, round: g.round, kind: (m.kind ?? "approve") as string, status: answer.status });
    after = g.gateId;
  }
  // give the row a moment to consume the last move and write its end (an event, not a poll, would be better — but the owner is judged from the STORE, so ask the store what it has)
  await call((c) => c.featureState(o.feature));
  await killNow(owner); // judged as a crash leaves it
  const inspection = await inspectStore(ts.store);
  const hits = new Map<string, number>();
  if (hitLog && existsSync(hitLog)) for (const l of readFileSync(hitLog, "utf8").split("\n")) if (l) hits.set(l, (hits.get(l) ?? 0) + 1);
  return { ts, inspection, view: view!, steps, fired: ts.killed(), deaths, hits, cleanup: () => ts.cleanup() };
}
