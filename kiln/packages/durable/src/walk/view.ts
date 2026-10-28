// What a person (or the CLI) sees of a walk: read from the STORE, never from memory (constitution IX). `feature state` returns it; `feature next --after` returns it once something changed.
import type { Services } from "../services.ts";
import type { GateDocData, BriefDocData, MoveDocData } from "../gate/documents.ts";
import type { JSON, MoveKind, StoredOutboxEntry } from "../types.ts";
import { ENDED, walkExists, type WalkDoc, type WalkStatus } from "./doc.ts";

export interface OpenGateView {
  gateId: string;
  gateKey: string;
  round: number;
  briefRef: string;
  vocabulary: MoveKind[];
  returnsTo: string[];
  noteRequired: MoveKind[];
  brief: JSON;
}
export interface HistoryEntry {
  type: string;
  at: number;
  actor: string;
  cause: string;
  subject: string;
  data: JSON;
}
export interface WalkView {
  feature: string;
  /** `starting` until the walk's first gate has been opened (the walk document does not exist yet). */
  status: WalkStatus | "starting";
  openGate: OpenGateView | null;
  history: HistoryEntry[];
}

interface OutboxDoc { entries: StoredOutboxEntry[] }

export async function readWalk(s: Services, feature: string): Promise<WalkView> {
  const wd = await s.store.snapshot<WalkDoc>("kiln.walk", feature);
  const status: WalkView["status"] = walkExists(wd) ? wd.status : "starting";
  let openGate: OpenGateView | null = null;
  if (walkExists(wd) && wd.openGateId) {
    const g = await s.store.snapshot<GateDocData>("kiln.gate", wd.openGateId);
    const b = await s.store.snapshot<BriefDocData>("kiln.brief", wd.openGateId);
    const settled = (await s.store.snapshot<MoveDocData>("kiln.move", wd.openGateId))?.record;
    // a gate whose move is already committed is no longer "open": the row has not yet consumed it (a short window), and the person has nothing to decide there
    // …and a gate whose decision step has not (re-)registered cannot take a move yet (r13: `not-ready`): it is shown once it can — `registerSlot` tells the watcher when that happens
    if (g?.gateId !== undefined && !settled && s.slots.get(wd.openGateId)?.registered) {
      openGate = {
        gateId: g.gateId, gateKey: g.gateKey as string, round: Number(g.gateId.split(":").pop()), briefRef: g.briefRef!, vocabulary: [...(g.vocabulary ?? [])] as MoveKind[],
        returnsTo: [...(g.returnsTo ?? [])], noteRequired: [...(g.noteRequired ?? [])] as MoveKind[], brief: (b?.content ?? null) as JSON,
      };
    }
  }
  const entries = (await s.store.snapshot<OutboxDoc>("kiln.outbox", "main"))?.entries ?? [];
  const history = entries
    .filter((e) => e.subject === feature || e.subject.startsWith(`gate:${feature}:`))
    .map((e) => ({ type: e.type, at: e.at, actor: e.actor, cause: e.cause, subject: e.subject, data: e.data }));
  return { feature, status, openGate, history };
}

/** True when `v` is something the caller waiting `after` a gate should be told: a different open gate, or the end of the walk. */
export const changed = (v: WalkView, after: string | undefined): boolean => (v.openGate ? v.openGate.gateId !== after : (ENDED as readonly string[]).includes(v.status));

/** `feature next`: re-reads the store until something changed. The waiter is armed BEFORE each read (no change is lost) and holds no timer (constitution IX). */
export async function nextWalk(s: Services, feature: string, after?: string): Promise<WalkView> {
  for (;;) {
    const armed = s.watch.arm(feature);
    const v = await readWalk(s, feature);
    if (changed(v, after)) {
      armed.disarm();
      return v;
    }
    await armed.promise;
  }
}
