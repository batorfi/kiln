// Opening a gate (FR-010, contracts/gate-contract.md): ONE commit writes the gate document, the brief as it will be shown and the `gate.opened` entry (actor: the opener, cause: the command
// key) and creates the gate task. After any crash the gate is absent or whole (I3). Keyed through the command ledger: the same key opens one gate.
import { briefRef, plain } from "../canonical.ts";
import { Refuse, runCommand, validKey } from "../commands.ts";
import { isActor } from "#contracts/events/grammar.ts";
import { appendEvent } from "../record/append.ts";
import type { Services } from "../services.ts";
import { GATE_ID_PATTERN, refused, type GateDocument, type GateSpec, type JSON, type Key, type OpenOutcome, type TaskId } from "../types.ts";
import type { BriefDocData, GateDocData } from "./documents.ts";
import { walkDoc } from "../walk/doc.ts";
import { noteRequiredOf, vocabularyOf } from "./flow.ts";

/**
 * `opts.awaitRegistered` (default true, r13's behaviour): wait, bounded, until the gate's decision step has registered so that `opened` means "can take a move". A TASK STEP that opens a gate (the walk's row) passes
 * false: while the step runs, the library cannot schedule the gate's own tasks, so the wait could only time out (3 s per gate, measured). The walk shows a gate to a person only once it has registered
 * (`readWalk`), and a move that still arrives early is `not-ready` — transient, retry the same key.
 */
export async function openGate(s: Services, key: Key, spec: GateSpec, opts: { awaitRegistered?: boolean } = {}): Promise<OpenOutcome> {
  await s.hooks.at("open.begin");
  if (!s.ready) return refused("not-ready", { detail: "the owner has not finished starting; retry the same key" });
  if (!validKey(key)) return refused("invalid-move", { detail: "the key is a non-empty string of at most 200 characters" });
  if (typeof spec?.gateId !== "string" || !GATE_ID_PATTERN.test(spec.gateId)) return refused("invalid-move", { detail: `the gate id must match ${GATE_ID_PATTERN}` });
  const vocabulary = vocabularyOf(spec.gateKey, spec.flow);
  if (!vocabulary) return refused("invalid-move", { detail: `"${String(spec.gateKey)}" is not a gate of flow ${String(spec.flow)}` });
  if (typeof spec.openedBy !== "string" || spec.openedBy.trim() === "") return refused("invalid-move", { detail: "openedBy names who opens the gate (it becomes the actor of gate.opened)" });
  if (!isActor(spec.openedBy)) return refused("invalid-move", { detail: `openedBy "${spec.openedBy}" is not an actor id (a task:<n>, factory, system, director, <name>@<token> or script:<name>)` });
  if (spec.returnsTo !== undefined && !(Array.isArray(spec.returnsTo) && spec.returnsTo.every((t) => typeof t === "string" && t !== ""))) return refused("invalid-move", { detail: "returnsTo is a list of gate keys, @build or roadmap" });
  // r14 move semantics (a note on every corrective move) belong to the gates of a WALK — opened with `walk` or `returnsTo`. A gate opened the r13 way keeps r13's behaviour exactly (FR-070).
  const carriesWalkSemantics = spec.walk !== undefined || spec.returnsTo !== undefined;
  let ref: string;
  try {
    ref = briefRef(spec.brief);
  } catch (e) {
    return refused("invalid-move", { detail: `the brief is not plain JSON: ${(e as Error).message}` });
  }

  const out = await runCommand<{ gate: GateDocument; taskId: TaskId }>(s, key, "gate.open", spec as unknown as JSON, async (tx) => {
    const g = await tx.doc<GateDocData>("kiln.gate", spec.gateId, {});
    if (g.gateId !== undefined) throw new Refuse(refused("key-conflict", { original: g.openKey })); // this gate id was opened under another key
    const openedAt = s.now();
    const gate: GateDocument = { gateId: spec.gateId, gateKey: spec.gateKey, flow: spec.flow, vocabulary, noteRequired: carriesWalkSemantics ? (noteRequiredOf(spec.gateKey, spec.flow) ?? []) : [], returnsTo: [...(spec.returnsTo ?? [])], briefRef: ref, openedBy: spec.openedBy, openedAt, openKey: key };
    Object.assign(g, plain(gate)); // drafts take ownership of what they are given: hand them copies
    const brief = await tx.doc<BriefDocData>("kiln.brief", spec.gateId, {});
    brief.briefRef = ref;
    brief.content = plain(spec.brief);
    const round = Number(spec.gateId.split(":").pop());
    await appendEvent(tx, { type: "gate.opened", subject: spec.gateId, at: openedAt, actor: spec.openedBy, cause: key, data: { briefRef: ref, gateKey: spec.gateKey, flow: spec.flow, ...(/^gate:/.test(spec.gateId) && Number.isInteger(round) ? { round } : {}) } });
    const taskId = await tx.createTask("kiln.gate", { gateId: spec.gateId }, { kind: "factory" });
    g.gateTask = taskId;
    if (spec.walk) {
      // r14: a gate of a WALK is recorded as the feature's open gate in the SAME commit — and the opening is refused while a feature-level move is waiting to be consumed, so there is no window
      // in which that move sees "no gate open" and a gate then opens (research R6).
      const wd = await walkDoc(tx, spec.walk.feature);
      if (wd.pending) throw new Refuse(refused("stale", { winner: wd.pending.key, detail: "feature-moved: a feature-level move is waiting for the walk; the gate is not opened" }));
      wd.openGateId = spec.gateId;
    }
    await s.hooks.at("open.after-write"); // the writes are made, the commit has not returned
    return { gate, taskId };
  }, spec.openedBy);
  if (out.status === "refused") return out;
  if (out.status === "applied") await s.hooks.at("open.committed");
  if (opts.awaitRegistered !== false) await registered(s, spec.gateId, 3000); // `opened` means the gate can take a move: wait (bounded) for its decision step to register
  if (spec.walk) s.watch.notify(spec.walk.feature); // a waiting `feature next` re-reads the store
  return { status: out.status === "applied" ? "opened" : "repeat", gate: out.result.gate, taskId: out.result.taskId };
}

/** Waits (bounded) until the gate's decision step is registered in this owner. Never throws; a timeout simply returns, and a move before registration is `not-ready`. */
async function registered(s: Services, gateId: string, ms: number): Promise<void> {
  const deadline = Date.now() + ms;
  while (!s.slots.get(gateId)?.registered && Date.now() < deadline) await new Promise((r) => setTimeout(r, 10));
}
