// Test support for the walk tests: an in-process factory, the scripted decider, and a driver that settles the open gate of a walk with a chosen move until the walk ends.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openFactory, type Factory } from "#durable/factory.ts";
import type { Move, Outcome } from "#durable/types.ts";
import type { OpenGateView, WalkView } from "#durable/walk/view.ts";
import type { WalkInput } from "#durable/walk/input.ts";

export const DECIDER = "script:r14";
export const INTERFACE: WalkInput = { flow: "v2", facts: { paths: ["web/app.tsx"], labels: ["ui"], journeys: ["J1.3"] }, built: { ui_files_changed: true } };
export const PLAIN: WalkInput = { flow: "v2", facts: { paths: ["src/lib/a.ts"], labels: [], journeys: [] } };

export async function withFactory(run: (f: Factory, store: string) => Promise<void>): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), "k14-walk-"));
  const store = join(dir, "s");
  const f = await openFactory({ store });
  try {
    await f.ready;
    await run(f, store);
  } finally {
    await f.close().catch(() => {});
    rmSync(dir, { recursive: true, force: true });
  }
}

/** What to send at an open gate; `undefined` stops the driver there. */
export type Chooser = (gate: OpenGateView, n: number) => Partial<Move> | undefined;
export const approveAll: Chooser = (g) => ({ kind: "approve", ...(g.gateKey === "gate0" ? { admit: {} } : {}) });

export interface Driven {
  /** The gates the driver settled, in order, with the outcome each move got. */
  steps: { gateId: string; gateKey: string; round: number; kind: string; outcome: Outcome }[];
  last: WalkView;
}
/** Settles the walk's open gates one by one with `choose` until the walk ends (or `choose` returns undefined). Waits for each next gate on the owner's event — never by polling. */
export async function drive(f: Factory, feature: string, choose: Chooser = approveAll, max = 60): Promise<Driven> {
  const steps: Driven["steps"] = [];
  let after: string | undefined;
  for (let n = 0; n < max; n++) {
    const v = await f.walks.next(feature, after);
    if (!v.openGate) return { steps, last: v };
    const g = v.openGate;
    const m = choose(g, n);
    if (!m) return { steps, last: v };
    const outcome = await f.gates.submit(g.gateId, `m:${g.gateId}`, { kind: "approve", decidedBy: DECIDER, briefRef: g.briefRef, ...m } as Move);
    steps.push({ gateId: g.gateId, gateKey: g.gateKey, round: g.round, kind: (m.kind ?? "approve") as string, outcome });
    after = g.gateId;
  }
  throw new Error(`the walk of ${feature} did not end within ${max} gates`);
}

export const rowOf = async (f: Factory) => (await f.tasks.list()).find((t) => t.kind === "kiln.row");

// ── moving a walk to a chosen place and making a chosen move there (US5) ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
import type { GateKey } from "#contracts/moves.ts";
export const mkMove = (g: OpenGateView, m: Partial<Move>): Move => ({ kind: "approve", decidedBy: DECIDER, briefRef: g.briefRef, ...m }) as Move;

/** Approves the walk\'s open gates until `key`/`round` is the open one, and returns that view. `then` lets a test choose differently on the way (default: approve). */
export async function walkTo(f: Factory, feature: string, key: GateKey, round = 1): Promise<WalkView> {
  let after: string | undefined;
  for (let n = 0; n < 80; n++) {
    const v = await f.walks.next(feature, after);
    const g = v.openGate;
    if (!g) throw new Error(`the walk of ${feature} ended before ${key}#${round}`);
    if (g.gateKey === key && g.round === round) return v;
    const r = await f.gates.submit(g.gateId, `m:${g.gateId}`, mkMove(g, g.gateKey === "gate0" ? { admit: {} } : {}));
    if (r.status !== "committed" && r.status !== "repeat") throw new Error(`could not approve ${g.gateId}: ${JSON.stringify(r)}`);
    after = g.gateId;
  }
  throw new Error(`${key}#${round} was not reached`);
}
/** Makes `m` at the open gate and returns the outcome plus the NEXT view (waiting for the walk to move on). */
export async function moveHere(f: Factory, feature: string, v: WalkView, m: Partial<Move>, key = "mv"): Promise<{ outcome: Outcome; next: WalkView }> {
  const g = v.openGate!;
  const outcome = await f.gates.submit(g.gateId, `${key}:${g.gateId}`, mkMove(g, m));
  const next = outcome.status === "committed" || outcome.status === "repeat" ? await f.walks.next(feature, g.gateId) : v;
  return { outcome, next };
}
/** The gates a walk opened, as `key#round`, in order. */
export const openedOrder = (v: WalkView): string[] => v.history.filter((h) => h.type === "gate.opened").map((h) => h.subject.split(":").slice(2).join("#"));
