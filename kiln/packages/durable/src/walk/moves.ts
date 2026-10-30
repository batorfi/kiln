// The feature-level move (walk-contract §6, research R6): a person may send a feature back to an earlier gate AT ANY TIME — even when no gate is open and a step is running. It is a move on the FEATURE, not on a
// gate (a settled gate refuses moves; between gates there is none): kind `reject`, a target, a note and a key, with the same keyed-exactly-once and first-move-wins rules as a gate move.
//   · a gate is open  → the move goes into that gate's decision slot; the decision step's ONE commit writes the withdrawal, the feature's record of the move and the entries — and ends the gate WITHOUT settling it
//   · no gate is open → one commit records the move as `pending`; the row consumes it at its next wake and ignores the step it was running
// Everything is judged against the STORE (the `kiln.walk` document), never against memory.
import { earlierThan, flowOf } from "#contracts/flow/index.ts";
import { canonicalJson, plain, sha256Hex } from "../canonical.ts";
import type { MoveDocData } from "../gate/documents.ts";
import { deliverWithdraw } from "../gate/move.ts";
import { isActor } from "#contracts/events/grammar.ts";
import { appendEvent } from "../record/append.ts";
import type { Services } from "../services.ts";
import { KEY_MAX, refused, type FeatureMove, type FeatureMoveRecord, type FeatureOutcome, type Key } from "../types.ts";
import { ENDED, walkDoc, walkExists, type WalkDoc } from "./doc.ts";
import { pinsOf, type WalkState } from "./state.ts";

// a note is compared as its digest, so a feature-level move of an ARCHIVED feature (note text gone, digest kept) still repeats
const identity = (m: FeatureMove & { noteDigest?: string }): unknown => {
  const { note, ...rest } = m;
  return note !== undefined ? { ...rest, noteDigest: sha256Hex(note) } : rest;
};
const sameMove = (a: FeatureMove, b: FeatureMove): boolean => canonicalJson(identity(a)) === canonicalJson(identity(b));

/** The gate the walk is at and its state, from the row's checkpoint (the one place a walk's state lives). */
async function cursorOf(s: Services, feature: string): Promise<{ w: WalkState } | null> {
  const rows = await s.store.tasks({ kind: "kiln.row" });
  const row = rows.find((t) => (t.input as { feature?: string } | null)?.feature === feature);
  const w = (row?.checkpoint as { w?: WalkState } | undefined)?.w;
  return w ? { w } : null;
}

export async function submitFeatureMove(s: Services, feature: string, key: Key, move: FeatureMove): Promise<FeatureOutcome> {
  if (!s.ready) return refused("not-ready", { detail: "the owner has not finished starting; retry the same key" });
  try {
    if (typeof key !== "string" || key.trim() === "" || key.length > KEY_MAX) return refused("invalid-move", { detail: "the key is a non-empty string of at most 200 characters" });
    if (typeof move !== "object" || move === null) return refused("invalid-move", { detail: "the move is not an object" });
    if (typeof move.decidedBy === "string" && move.decidedBy.trim() !== "" && !isActor(move.decidedBy)) return refused("invalid-move", { detail: `decidedBy "${move.decidedBy}" is not an actor id (<name>@<token>, e.g. human@batorfi, or script:<name>)` });
    if ("noteDigest" in move) return refused("invalid-move", { detail: "noteDigest is what the archive leaves of a note: a caller sends the note, never its digest" });
    if (move.kind !== "reject") return refused("invalid-move", { detail: `"${String(move.kind)}" is not a feature-level move: only a reject can be made on a feature` });
    if (typeof move.decidedBy !== "string" || move.decidedBy.trim() === "") return refused("invalid-move", { detail: "decidedBy is empty: a move with no decider is refused" });
    if (typeof move.note !== "string" || move.note.trim() === "") return refused("invalid-move", { detail: "a reject needs a note: it becomes the next step's instruction" });
    if (typeof move.target !== "string") return refused("invalid-move", { detail: "a reject names its target: an earlier gate or @build" });
    move = { kind: "reject", decidedBy: move.decidedBy, target: move.target, note: move.note };

    for (let attempt = 0; attempt < 8; attempt++) {
      const wd = await s.store.snapshot<WalkDoc>("kiln.walk", feature);
      if (!walkExists(wd)) return refused("unknown-gate", { detail: `no walk "${feature}"` });
      const prior = wd.moves?.[key];
      if (prior) return sameMove(prior.move, move) ? { status: "repeat", record: plain(prior) } : refused("key-conflict", { original: key });
      if ((ENDED as readonly string[]).includes(wd.status)) return refused("stale", { detail: `the walk has ended (${wd.status})` });
      if (wd.status === "admitting") return refused("stale", { detail: "the feature is not admitted yet: only the Roadmap gate decides before then" });
      if (wd.pending) return refused(attempt === 0 ? "stale" : "lost-race", { winner: wd.pending.key, detail: "another feature-level move is waiting for the walk" });

      const at = await cursorOf(s, feature);
      if (!at) return refused("stale", { detail: "the walk has no state to return from yet" });
      const flow = flowOf("v2");
      const allowed = earlierThan(flow, at.w.cursor, pinsOf(at.w.pinned));
      if (!allowed.includes(move.target)) {
        return refused("invalid-move", { detail: `"${move.target}" is not a place this feature can go back to from ${at.w.cursor} (allowed: ${allowed.join(", ") || "none"})` });
      }

      if (wd.openGateId) {
        const r = await deliverWithdraw(s, wd.openGateId, key, move);
        if (r === "committed") {
          const after = await s.store.snapshot<WalkDoc>("kiln.walk", feature);
          return { status: "committed", record: plain(after!.moves![key]) };
        }
        if (r === "not-ready") return refused("not-ready", { detail: "the open gate's decision step has not (re-)registered; retry the same key" });
        if (typeof r === "object") return refused("store-error", { detail: r.error });
        // "gate-ended": a person's move settled it (then this move is recorded for the walk to apply AFTER it), or another withdrawal ended it (then the walk document tells us who won)
        const after = await s.store.snapshot<WalkDoc>("kiln.walk", feature);
        if (after?.pending) continue;
      }

      // no gate is open: record the move; the row applies it at its next wake and ignores the step it was running
      const recorded = await s.store.commit(async (tx): Promise<{ lost: string } | { open: true } | { record: FeatureMoveRecord }> => {
        const w = await walkDoc(tx, feature);
        if (w.moves?.[key]) return { record: plain(w.moves[key]) };
        if (w.pending) return { lost: w.pending.key };
        // a gate opened between the snapshot above and this commit: recording the move now would leave a gate open with a move pending. Write nothing; the next pass withdraws that gate.
        // (A gate that already has its move or its withdrawal is not open to withdraw: the row has only not yet consumed it, and the move is recorded to be applied after it.)
        if (w.openGateId) {
          const md = await tx.doc<MoveDocData>("kiln.move", w.openGateId, { record: null });
          if (!md.record && !md.withdrawn) return { open: true };
        }
        const decidedAt = s.now();
        const rec = plain({ key, move: { ...move }, decidedAt, effect: "recorded" as const, ...(w.openGateId ? { gateId: w.openGateId } : {}) });
        w.moves = { ...(w.moves ?? {}), [key]: rec };
        w.pending = rec;
        await appendEvent(tx, { type: "move.committed", subject: feature, at: decidedAt, actor: move.decidedBy, cause: key, data: { kind: "reject", scope: "feature", target: move.target, decidedBy: move.decidedBy } });
        await s.hooks.at("walk.withdraw-after-write");
        return { record: rec };
      });
      if ("open" in recorded) continue;
      if ("lost" in recorded) {
        if (attempt >= 1) return refused("lost-race", { winner: recorded.lost });
        continue;
      }
      await s.hooks.at("walk.withdraw-committed");
      s.watch.notify(feature);
      return { status: "committed", record: recorded.record };
    }
    return refused("store-error", { detail: "gave up after repeated races" });
  } catch (e) {
    return refused("store-error", { detail: (e as Error).message });
  }
}

