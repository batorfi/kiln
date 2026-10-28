// Submitting a move (FR-012 … FR-016, contracts/gate-contract.md). The first caller takes the decision step's slot; everyone else is judged against the STORED record — never against memory:
//   same key + equal move → repeat · same key + other move → key-conflict · another key → stale (the record existed when we arrived) or lost-race (it appeared while we waited for the slot).
// A move is validated against the gate's STORED vocabulary, must name a decider and the brief the gate was opened with (invalid-move otherwise). `committed` is returned only after the
// commit resolved: it means durable.
import { KEY_MAX, refused, type FeatureMove, type GateId, type Key, type Move, type MoveRecord, type Outcome } from "../types.ts";
import { canonicalJson, plain } from "../canonical.ts";
import { flowOf } from "#contracts/flow/index.ts";
import type { Services } from "../services.ts";
import { gateExists, type GateDocData, type MoveDocData } from "./documents.ts";

// Equal means equal in EVERY field the record holds (r14: the note, the target and the admission decisions too) — compared as canonical JSON, so key order never matters.
const sameMove = (a: Move, b: Move): boolean => canonicalJson(a) === canonicalJson(b);

const FIX_ROUNDS = [0, 1, 2, 3];
const ADMIT_KEYS = ["require", "overrideTriage", "fixRounds"];
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** The r14 fields of a move, judged against the gate's STORED document (never against the walk's memory). Returns the refusal detail, or `null` when they are fine. */
function judgeExtras(g: GateDocData, move: Move): string | null {
  if (move.note !== undefined && typeof move.note !== "string") return "the note is a string";
  if (move.target !== undefined && typeof move.target !== "string") return "the target is a gate key, @build or roadmap";
  const needsNote = g.noteRequired ?? [];
  if (needsNote.includes(move.kind) && (typeof move.note !== "string" || move.note.trim() === "")) return `a corrective move needs a note ("${move.kind}" at this gate carries the next step's instruction)`;
  if (move.target !== undefined) {
    if (move.kind !== "reject") return "a target belongs to a reject";
    const allowed = [g.gateKey as string, ...(g.returnsTo ?? [])];
    if (!allowed.includes(move.target)) return `"${move.target}" is not a place this gate can send work (allowed: ${allowed.join(", ")})`;
  }
  if (move.admit !== undefined) {
    if (g.gateKey !== "gate0" || move.kind !== "approve") return "admit belongs to the Roadmap gate's approve";
    if (!isObj(move.admit)) return "admit is an object";
    const extra = Object.keys(move.admit).filter((k) => !ADMIT_KEYS.includes(k));
    if (extra.length) return `admit has no field ${extra.join(", ")} (allowed: ${ADMIT_KEYS.join(", ")})`;
    const a = move.admit;
    if (a.fixRounds !== undefined && !FIX_ROUNDS.includes(a.fixRounds as number)) return "fixRounds must be 0, 1, 2 or 3";
    if (a.overrideTriage !== undefined && typeof a.overrideTriage !== "boolean") return "overrideTriage is true or false";
    if (a.require !== undefined) {
      if (!Array.isArray(a.require) || a.require.some((k) => typeof k !== "string")) return "require is a list of gate keys";
      const flow = flowOf(g.flow!);
      const conditional = flow.gates.filter((x) => x.appliesWhen).map((x) => x.key as string);
      const bad = (a.require as string[]).find((k) => !conditional.includes(k));
      if (bad !== undefined) return `"${bad}" is not a gate a person can require (only the conditional gates: ${conditional.join(", ")})`;
    }
  }
  return null;
}

export async function submitMove(s: Services, gateId: GateId, key: Key, move: Move): Promise<Outcome> {
  await s.hooks.at("move.received");
  const out = await decide(s, gateId, key, move);
  await s.hooks.at("move.ack-sent"); // the outcome is determined and is being handed back to the caller
  return out;
}

async function decide(s: Services, gateId: GateId, key: Key, move: Move): Promise<Outcome> {
  if (!s.ready) return refused("not-ready", { detail: "the owner has not finished starting; retry the same key" });
  try {
    if (typeof key !== "string" || key.trim() === "" || key.length > KEY_MAX) return refused("invalid-move", { detail: "the key is a non-empty string of at most 200 characters" });
    if (typeof move !== "object" || move === null) return refused("invalid-move", { detail: "the move is not an object" });
    if (typeof move.decidedBy !== "string" || move.decidedBy.trim() === "") return refused("invalid-move", { detail: "decidedBy is empty: a move with no decider is refused" });
    if (typeof move.kind !== "string") return refused("invalid-move", { detail: "the move has no kind" });
    if (typeof move.briefRef !== "string" || move.briefRef === "") return refused("invalid-move", { detail: "the move names no brief: a decision is made on a brief that was shown" });

    const g = await s.store.snapshot<GateDocData>("kiln.gate", gateId);
    if (!gateExists(g)) return refused("unknown-gate");
    // r14: a gate a feature-level move withdrew is not settled and takes no move: the move that ended it is the winner
    const ended = await s.store.snapshot<MoveDocData>("kiln.move", gateId);
    if (!ended?.record && ended?.withdrawn) return refused("stale", { winner: ended.withdrawn.key, detail: "the gate was withdrawn by a feature-level move" });
    if ((move.kind as string) === "mitigate") return refused("invalid-move", { detail: `"mitigate" is not a move a person can make (it is the factory's automatic fix round, never a settlement)` });
    if (!g.vocabulary.includes(move.kind)) return refused("invalid-move", { detail: `"${move.kind}" is not a move of this gate (allowed: ${g.vocabulary.join(", ")})` });
    if (move.briefRef !== g.briefRef) return refused("invalid-move", { detail: "the move names a different brief than the one this gate was opened with" });
    const extras = judgeExtras(g, move);
    if (extras) return refused("invalid-move", { detail: extras });

    // only the fields the record holds: an unknown field is neither stored nor part of a repeat
    move = { kind: move.kind, decidedBy: move.decidedBy, briefRef: move.briefRef, ...(move.note !== undefined ? { note: move.note } : {}), ...(move.target !== undefined ? { target: move.target } : {}), ...(move.admit !== undefined ? { admit: plain(move.admit) } : {}) };
    let how: "arrived" | "raced" = "arrived";
    for (let attempt = 0; attempt < 8; attempt++) {
      const doc = await s.store.snapshot<MoveDocData>("kiln.move", gateId);
      const rec = doc?.record ?? null;
      if (rec) return judge(plain(rec), key, move, how);
      if (doc?.withdrawn) return refused("stale", { winner: doc.withdrawn.key, detail: "the gate was withdrawn by a feature-level move" });
      const slot = s.slots.get(gateId);
      if (!slot || !slot.registered) {
        if (slot?.taken && slot.inflight) {
          await slot.inflight; // someone is committing right now: judge against what they stored
          how = "raced";
          continue;
        }
        return refused("not-ready", { detail: "the decision step has not (re-)registered; retry the same key" });
      }
      if (slot.taken) {
        await slot.inflight; // the first caller took the slot: wait for its commit, then judge against the store
        how = "raced";
        continue;
      }
      slot.taken = true;
      let finish!: () => void;
      slot.inflight = new Promise<void>((r) => (finish = r));
      const result = await new Promise<"committed" | "lost" | { error: string }>((resolve) => slot.deliver?.({ key, move, done: resolve }));
      finish();
      if (typeof result === "object") return refused("store-error", { detail: result.error });
      if (result === "committed") {
        const stored = (await s.store.snapshot<MoveDocData>("kiln.move", gateId))?.record;
        return { status: "committed", record: plain(stored as MoveRecord) };
      }
      how = "raced"; // "lost": a record appeared; judge against it
    }
    return refused("store-error", { detail: "gave up after repeated races" });
  } catch (e) {
    return refused("store-error", { detail: (e as Error).message });
  }
}

function judge(rec: MoveRecord, key: Key, move: Move, how: "arrived" | "raced"): Outcome {
  if (rec.key !== key) return refused(how === "arrived" ? "stale" : "lost-race", { winner: rec.key });
  return sameMove(rec.move, move) ? { status: "repeat", record: rec } : refused("key-conflict", { original: key });
}

// ── r14: delivering a FEATURE-LEVEL move to the gate that is open ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export type WithdrawResult = "committed" | "gate-ended" | "not-ready" | { error: string };

/**
 * Hands a withdrawal to the open gate's decision step through the SAME single-shot slot a person's move uses, so first-move-wins and exactly-once are the one proved mechanism. The decision step's
 * single commit writes the withdrawal (never a move record). `gate-ended`: the gate already has a move or a withdrawal — judge against the store again.
 */
export async function deliverWithdraw(s: Services, gateId: GateId, key: Key, move: FeatureMove): Promise<WithdrawResult> {
  await s.hooks.at("walk.withdraw-received");
  for (let attempt = 0; attempt < 8; attempt++) {
    const doc = await s.store.snapshot<MoveDocData>("kiln.move", gateId);
    if (doc?.record || doc?.withdrawn) return "gate-ended";
    const slot = s.slots.get(gateId);
    if (!slot || !slot.registered) {
      if (slot?.taken && slot.inflight) {
        await slot.inflight;
        continue;
      }
      return "not-ready";
    }
    if (slot.taken) {
      await slot.inflight;
      continue;
    }
    slot.taken = true;
    let finish!: () => void;
    slot.inflight = new Promise<void>((r) => (finish = r));
    const result = await new Promise<"committed" | "lost" | { error: string }>((resolve) => slot.deliver?.({ kind: "withdraw", key, move, done: resolve }));
    finish();
    if (typeof result === "object") return { error: result.error };
    if (result === "committed") return "committed";
    // "lost": a move or another withdrawal got there first — judge against the store
  }
  return { error: "gave up after repeated races" };
}
