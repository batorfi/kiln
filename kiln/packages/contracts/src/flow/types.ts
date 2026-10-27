// Shapes of a flow definition (data-model §2–3). Types only.
import type { FlowVersion, GateKey, MoveKind } from "../moves.ts";

/** Deterministic predicates only — never an LLM. Shape from docs/concepts/ui-flow.md §4.1, §5.1. */
export interface AppliesWhen {
  paths?: readonly string[];
  labels?: readonly string[];
  /** Experience design: the row cites a charter journey step. */
  journeys?: "any";
  /** UI review: ui_files_changed, tokens_changed, routes_changed. */
  diff?: readonly string[];
}

// ── r14: the rules the walk executes (specs/012-…/data-model.md §1–§2). All additions are OPTIONAL: flow v1 and every r12 record stay valid. ──────────────────────────────────────
/** Where a reject may send work: an earlier gate, `@build` (after Implementation, before Code review — the code itself) or the roadmap. */
export type Target = GateKey | "@build" | "roadmap";
/** What a move does next. `not-admitted` is the admission crossing's reject: nothing is admitted and the walk ends. */
export type Leads = "next" | "same-gate" | "workers-then-same-gate" | "rebuild-then-recross" | "split" | "roadmap-edit" | "not-admitted";
export interface MoveRule {
  /** Corrective kinds (revise, reject, restart, split+revise) carry a note, which becomes the next step's instruction. */
  note: "required" | "optional";
  leads: Leads;
  /** `reject` only: what the move may name besides its own gate. `default` is where a reject with no target goes. */
  targets?: { earlier: true; roadmap?: boolean; default: "same-gate" | "@build" };
}
export type Delegable = "never" | "default" | "explicit";

export interface GateDefinition {
  key: GateKey;
  /** The plain name people read. v1 = the first program's names; v2 = GATE-1's. */
  name: string;
  /** One question per gate (v2 only; v1 carries none). */
  question?: string;
  /** Declared, never evaluated here: when the gate applies (flow v2's two interface gates). Evaluation is r14's. */
  appliesWhen?: AppliesWhen;
  /** A deterministic evidence role that is not a model (UI review: "ui-checker"). */
  check?: string;
  phase: "program" | "contract" | "build-and-prove" | "release";
  /** The moves a PERSON may make here. */
  moves: readonly MoveKind[];
  /** Automatic kinds the factory may apply before a person decides (Verification: ["mitigate"]). */
  automatic?: readonly MoveKind[];
  /** The judge role for this gate, if any. */
  judge?: string;
  /** Verification only: automatic fix rounds before the gate opens for a person. */
  mitigationCap?: { default: number; min: number; max: number };
  /** Absent = built-in. `added` is r26's: the check refuses arming on it and follows `after` for cycles. */
  origin?: "built-in" | "added";
  /** Reserved for added gates (r26): where the gate sits. */
  after?: GateKey;
  /** One rule per move kind in `moves` (and per `automatic` kind). */
  rules?: Partial<Record<MoveKind, MoveRule>>;
  /** Triage may skip this gate. Concept and Architecture only — never Documentation, never a judged gate after Architecture. */
  triage?: "skippable";
  /** The unattended tail may be armed here (Specification only). Data and check in r14; r21 acts on it. */
  armsTail?: true;
  delegable?: Delegable;
  /** The commit a `restart` rebuilds from (Implementation). */
  restorePoint?: true;
}

export interface RoleRoster {
  version: FlowVersion;
  /** Judge roles — strongest model only (P-II). */
  judges: readonly string[];
  /** Known producer roles (informational until roles become files). */
  producers: readonly string[];
}

export interface FlowDefinition {
  version: FlowVersion;
  /** v1: exactly ten entries (gate0, then 1…9). v2: twelve, in order: gate0, 1, 2, 2a, 3, 4, 5, 6, 6a, 7, 8, 9. */
  gates: readonly GateDefinition[];
  roster: RoleRoster;
  /** A flow may forbid triage skipping altogether (`no_triage_skip`). */
  noTriageSkip?: boolean;
}

// ── facts, applicability and reasons (contracts/flow-data.md §3) ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** What the feature is, known at admission. Supplied (r18 will compute it from the roadmap); a missing fact is FALSE, and the reason says `absent`. */
export interface AdmissionFacts {
  paths?: readonly string[];
  labels?: readonly string[];
  journeys?: readonly string[];
}
/** What was actually changed, read once at UI review's slot. */
export interface BuiltFacts {
  ui_files_changed?: boolean;
  tokens_changed?: boolean;
  routes_changed?: boolean;
}
export type PredicateState = "match" | "no-match" | "absent";
/** WHY a gate applies or not: canonical JSON, so the same facts give the same bytes. */
export interface Reason {
  rule: { paths?: readonly string[]; labels?: readonly string[]; journeys?: "any"; diff?: readonly string[] };
  evaluated: { paths?: PredicateState; labels?: PredicateState; journeys?: PredicateState; diff?: PredicateState };
  verdict: boolean;
  text: string;
}
export interface Applicability {
  gate: GateKey;
  applies: boolean;
  why: "rule" | "required" | "unconditional" | "became-applicable";
  /** Absent for a gate with no rule (it always applies). */
  reason?: Reason;
}
/** One thing `validateFlow` found wrong. Stable codes are listed in contracts/check-flow.md §2. */
export interface Fault {
  code: string;
  gate?: GateKey;
  detail: string;
}
