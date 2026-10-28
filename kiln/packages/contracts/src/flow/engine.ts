// The flow engine: the pure functions that read a flow's DATA and answer "what comes next, what may be done here, where does it lead" (research R1, contracts/flow-data.md §1).
// No I/O, no clock, no model, no `node:` import. The walk (durable) acts on these answers; `kiln check flow` validates the data they read; the director (r18) will compose them.
// Nothing here knows a gate by name: every rule is a field of the definition, so changing the data changes the answer (SC-009).
import type { GateKey, MoveKind } from "../moves.ts";
import type { FlowDefinition, GateDefinition, MoveRule, Target } from "./types.ts";

/** What has been decided about the conditional and skippable gates of ONE feature. Pinned at admission and never reversed (spec FR-011, FR-016). */
export interface Pins {
  /** Recorded not applicable (an interface gate whose rule was false and which nobody required). */
  notApplicable: readonly GateKey[];
  /** Skipped by triage (Concept and Architecture only). */
  skipped: readonly GateKey[];
}
export const NO_PINS: Pins = { notApplicable: [], skipped: [] };

/** Every gate key of the flow, in order. */
export const order = (flow: FlowDefinition): GateKey[] => flow.gates.map((g) => g.key);

/** The definition of one gate; throws by name for a key the flow does not have (a programming error — callers hold keys the flow gave them). */
export function gateDef(flow: FlowDefinition, key: GateKey): GateDefinition {
  const g = flow.gates.find((x) => x.key === key);
  if (!g) throw new Error(`no gate ${key} in flow ${flow.version}`);
  return g;
}

/** The rule of one move kind at one gate, or `undefined` when the gate does not offer it (or the flow carries no rules, as v1). */
export const rule = (flow: FlowDefinition, key: GateKey, kind: MoveKind): MoveRule | undefined => gateDef(flow, key).rules?.[kind];

/** The kinds a PERSON may make at this gate that need a note (GATE-5). `automatic` kinds are not a person's. */
export function noteRequired(flow: FlowDefinition, key: GateKey): MoveKind[] {
  const g = gateDef(flow, key);
  return g.moves.filter((k) => g.rules?.[k]?.note === "required");
}

const dropped = (pins: Pins): Set<GateKey> => new Set([...pins.notApplicable, ...pins.skipped]);

/** The feature gates the feature will actually cross, in order: every gate but the Roadmap gate, minus the pinned not-applicable and skipped ones. */
export function active(flow: FlowDefinition, pins: Pins = NO_PINS): GateKey[] {
  const out = dropped(pins);
  return flow.gates.filter((g) => g.key !== "gate0" && !out.has(g.key)).map((g) => g.key);
}

/** The next gate to open after `after` (use `gate0` for the first), or `null` when `after` is the last one. A gate not in the flow is a programming error. */
export function next(flow: FlowDefinition, pins: Pins, after: GateKey): GateKey | null {
  const all = order(flow);
  const at = all.indexOf(after);
  if (at < 0) throw new Error(`no gate ${after} in flow ${flow.version}`);
  const out = dropped(pins);
  for (let i = at + 1; i < all.length; i++) if (!out.has(all[i])) return all[i];
  return null;
}

/** Index of the gate that carries the restore point (Implementation), or -1. */
const restoreIndex = (flow: FlowDefinition): number => flow.gates.findIndex((g) => g.restorePoint === true);

/**
 * The places a `reject` made AT `key` may name besides its own gate: the active gates before it, `@build` when the gate comes after the restore point, and `roadmap` where the rule allows
 * it. A pinned not-applicable or skipped gate is never offered — there is nothing to re-open there (spec edge case). Empty when the gate offers no reject.
 */
export function targetsOf(flow: FlowDefinition, key: GateKey, pins: Pins = NO_PINS): Target[] {
  const r = rule(flow, key, "reject");
  if (!r?.targets) return [];
  const here = order(flow).indexOf(key);
  const out = dropped(pins);
  const before = flow.gates.filter((g, i) => i < here && g.key !== "gate0" && !out.has(g.key)).map((g) => g.key as Target);
  const out2: Target[] = [];
  const ri = restoreIndex(flow);
  for (const t of before) {
    out2.push(t);
    if (ri >= 0 && flow.gates[ri].key === t && here > ri) out2.push("@build");
  }
  if (r.targets.roadmap) out2.push("roadmap");
  return out2;
}

/** Triage (GATE-3): may skip the gates whose data says `skippable` — Concept and Architecture — and nothing else; a flow may forbid it altogether. */
export function triage(flow: FlowDefinition, requested: readonly GateKey[]): { ok: true; skip: GateKey[] } | { ok: false; refusal: string } {
  if (requested.length === 0) return { ok: true, skip: [] };
  if (flow.noTriageSkip) return { ok: false, refusal: "this flow forbids triage skipping (no_triage_skip)" };
  const skippable = flow.gates.filter((g) => g.triage === "skippable").map((g) => g.key);
  for (const k of requested) {
    const g = flow.gates.find((x) => x.key === k);
    if (!g) return { ok: false, refusal: `"${k}" is not a gate of flow ${flow.version}` };
    if (!skippable.includes(k)) return { ok: false, refusal: `triage may skip ${skippable.map((s) => gateDef(flow, s).name).join(" and ")} only; ${g.name} is not skippable` };
  }
  return { ok: true, skip: order(flow).filter((k) => requested.includes(k)) };
}
/** The gates triage proposes to skip for a small feature: every gate whose data says `skippable`. */
export const triageProposal = (flow: FlowDefinition): GateKey[] => flow.gates.filter((g) => g.triage === "skippable").map((g) => g.key);

/** The fix-round cap (GATE-6): the factory's setting of the Verification gate's `mitigationCap`; `requested` undefined means the default. */
export function cap(flow: FlowDefinition, requested?: number): { ok: true; cap: number } | { ok: false; refusal: string } {
  const c = flow.gates.find((g) => g.mitigationCap)?.mitigationCap;
  if (!c) return { ok: false, refusal: `flow ${flow.version} has no gate with automatic fix rounds` };
  if (requested === undefined) return { ok: true, cap: c.default };
  if (!Number.isInteger(requested) || requested < c.min || requested > c.max) return { ok: false, refusal: `the fix-round cap is an integer from ${c.min} to ${c.max}, not ${String(requested)}` };
  return { ok: true, cap: requested };
}

/** The scripted units a gate's artifact needs before the gate opens, in order: its author (unless the artifact is the code itself — a judged gate after the restore point), its deterministic check, its judge. */
export type UnitRole = "author" | "check" | "judge";
export function unitRoles(flow: FlowDefinition, key: GateKey): UnitRole[] {
  const g = gateDef(flow, key);
  const at = flow.gates.findIndex((x) => x.key === key);
  const ri = restoreIndex(flow);
  const roles: UnitRole[] = [];
  // the artifact of a judged gate after the restore point (Code review, UI review, Verification) is the code the workers built: the gate has no author of its own
  if (!(g.judge !== undefined && ri >= 0 && at > ri)) roles.push("author");
  if (g.check !== undefined) roles.push("check");
  if (g.judge !== undefined) roles.push("judge");
  return roles;
}

/** The keys whose artifacts a gate judges: every active gate before it, with the pseudo-artifact `@build` (the code) placed after the restore point when the gate comes after it. */
export function upstreamOf(flow: FlowDefinition, key: GateKey, pins: Pins = NO_PINS): string[] {
  const here = order(flow).indexOf(key);
  const ri = restoreIndex(flow);
  const out = dropped(pins);
  const keys: string[] = [];
  flow.gates.forEach((g, i) => {
    if (i >= here || g.key === "gate0") return;
    if (!out.has(g.key)) keys.push(g.key);
    if (i === ri && here > ri) keys.push("@build");
  });
  return keys;
}

// ── consequences: where a move leads (the-flow.md §7, executable; contracts/flow-data.md §1.1) ────────────────────────────────────────────────────────────────────────────────────────────────────────
export type Work = "author" | "workers" | "rebuild" | "none";
export interface Consequence {
  /** `next`: the next active gate · a gate key: that gate, a new round · `@build`: the code (rework or rebuild, then the first active gate after the restore point) · `roadmap`: out of the lane ·
   *  `not-admitted`: the admission crossing's reject. */
  goto: GateKey | "next" | "@build" | "roadmap" | "not-admitted";
  /** The active gates to cross again (every active gate from the target to the end). Empty when nothing is re-crossed. */
  recross: GateKey[];
  work: Work;
  /** The feature leaves the lane (or is never admitted). */
  leaves: boolean;
  /** What the walk records: `returned` (a reject to an earlier gate, a restart, a rework), `split`, `left-lane`, `not-admitted`; none for approve/revise/same-gate reject. */
  records: "returned" | "split" | "left-lane" | "not-admitted" | null;
}

/** The gates from `from` (inclusive) to the end that the feature will cross, given what is pinned away. */
const fromHere = (flow: FlowDefinition, pins: Pins, from: GateKey): GateKey[] => {
  const keys = active(flow, pins);
  const at = keys.indexOf(from);
  return at < 0 ? [] : keys.slice(at);
};
/** The active gates after the restore point (the first of them is where the code is judged). */
const afterBuild = (flow: FlowDefinition, pins: Pins): GateKey[] => {
  const ri = restoreIndex(flow);
  if (ri < 0) return [];
  const out = dropped(pins);
  return flow.gates.filter((g, i) => i > ri && !out.has(g.key)).map((g) => g.key);
};

/**
 * Where `kind` made at `gate` (naming `target`, or none) leads. THROWS BY NAME for a pair the data does not offer: `submitMove` has already refused such a move, so reaching here with one is a
 * programming error, never a user-visible state. `target` is validated by the caller against `targetsOf`.
 */
export function consequence(flow: FlowDefinition, gate: GateKey, kind: MoveKind, target: Target | undefined, pins: Pins = NO_PINS): Consequence {
  const r = rule(flow, gate, kind);
  if (!r) throw new Error(`the flow offers no "${kind}" at ${gate}`);
  const none = { recross: [] as GateKey[], leaves: false, records: null } as const;
  switch (r.leads) {
    case "next": return { goto: "next", work: "none", ...none };
    case "same-gate": {
      if (kind === "revise") return { goto: gate, work: "author", ...none };
      // a reject: the move's target, or the rule's default
      const t: Target | "same-gate" = target ?? r.targets?.default ?? "same-gate";
      if (t === "same-gate" || t === gate) return { goto: gate, work: "author", ...none };
      if (t === "roadmap") return { goto: "roadmap", work: "none", recross: [], leaves: true, records: "left-lane" };
      if (t === "@build") return { goto: "@build", work: "workers", recross: afterBuild(flow, pins), leaves: false, records: "returned" };
      return { goto: t, work: "author", recross: fromHere(flow, pins, t), leaves: false, records: "returned" };
    }
    case "workers-then-same-gate": return { goto: gate, work: "workers", ...none };
    case "rebuild-then-recross": return { goto: "@build", work: "rebuild", recross: afterBuild(flow, pins), leaves: false, records: "returned" };
    case "split": {
      // the work plan is revised: the active gate just before the restore point is re-crossed, then everything after it
      const ri = restoreIndex(flow);
      const out = dropped(pins);
      const before = flow.gates.filter((g, i) => i < ri && g.key !== "gate0" && !out.has(g.key));
      const plan = before[before.length - 1]?.key;
      if (!plan) throw new Error(`${gate}: split+revise has no earlier gate to revise`);
      return { goto: plan, work: "author", recross: fromHere(flow, pins, plan), leaves: false, records: "split" };
    }
    case "roadmap-edit": return { goto: gate, work: "none", ...none };
    case "not-admitted": return { goto: "not-admitted", work: "none", recross: [], leaves: true, records: "not-admitted" };
  }
}

/**
 * The places a FEATURE-LEVEL reject (made on the feature, not on a gate; spec FR-023) may name while the walk is at `cursor`: the active gates strictly before it, and `@build` when the cursor is past the
 * restore point. Never the roadmap — "pause the factory plus a Roadmap-gate decision" is how a feature is stopped, not a move kind (the-flow.md §11 P6).
 */
export function earlierThan(flow: FlowDefinition, cursor: GateKey, pins: Pins = NO_PINS): Target[] {
  const here = order(flow).indexOf(cursor);
  const out = dropped(pins);
  const ri = restoreIndex(flow);
  const res: Target[] = [];
  flow.gates.forEach((g, i) => {
    if (i >= here || g.key === "gate0" || out.has(g.key)) return;
    res.push(g.key);
    if (i === ri && here > ri) res.push("@build");
  });
  return res;
}

/** Where a feature-level reject to `target` leads: that gate (a fresh author) or the code (rework by the workers), and every active gate from there is crossed again. */
export function featureReject(flow: FlowDefinition, target: Target, pins: Pins = NO_PINS): Consequence {
  if (target === "roadmap") throw new Error("a feature-level reject never names the roadmap");
  if (target === "@build") return { goto: "@build", work: "workers", recross: afterBuild(flow, pins), leaves: false, records: "returned" };
  return { goto: target, work: "author", recross: fromHere(flow, pins, target), leaves: false, records: "returned" };
}
