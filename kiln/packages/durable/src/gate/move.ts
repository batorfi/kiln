// Submitting a move (FR-012 … FR-016, contracts/gate-contract.md). The first caller takes the decision step's slot; everyone else is judged against the STORED record — never against memory:
//   same key + equal move → repeat · same key + other move → key-conflict · another key → stale (the record existed when we arrived) or lost-race (it appeared while we waited for the slot).
// A move is validated against the gate's STORED vocabulary, must name a decider and the brief the gate was opened with (invalid-move otherwise). `committed` is returned only after the
// commit resolved: it means durable.
import { KEY_MAX, refused, type GateId, type Key, type Move, type MoveRecord, type Outcome } from "../types.ts";
import { plain } from "../canonical.ts";
import type { Services } from "../services.ts";
import { gateExists, type GateDocData, type MoveDocData } from "./documents.ts";

const sameMove = (a: Move, b: Move): boolean => a.kind === b.kind && a.decidedBy === b.decidedBy && a.briefRef === b.briefRef;

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
    if (!g.vocabulary.includes(move.kind)) return refused("invalid-move", { detail: `"${move.kind}" is not a move of this gate (allowed: ${g.vocabulary.join(", ")})` });
    if (move.briefRef !== g.briefRef) return refused("invalid-move", { detail: "the move names a different brief than the one this gate was opened with" });

    let how: "arrived" | "raced" = "arrived";
    for (let attempt = 0; attempt < 8; attempt++) {
      const rec = (await s.store.snapshot<MoveDocData>("kiln.move", gateId))?.record ?? null;
      if (rec) return judge(plain(rec), key, move, how);
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
