// Flow v2: the standard flow of constitution v2.1.0 — the Roadmap gate and eleven feature gates (r12 T049; contracts/flow-and-records.md §2).
// DATA ONLY. The two interface gates declare their `applies_when` rule (docs/concepts/ui-flow.md §4.1, §5.1); r14 EVALUATES it (applies.ts) and the walk records the outcome.
// r14 adds, per gate, the rules the engine executes (contracts/flow-data.md §2): what each move needs and where it leads, triage, the arming point, delegability, the restore point.
// Internal keys are the first program's, plus `2a-experience` and `6a-ui-review`.
// tests/flow-vs-constitution.test.ts reads the constitution, the PRD and ui-flow.md and fails if this file drifts from them.
import type { AppliesWhen, FlowDefinition, GateDefinition, MoveRule } from "./types.ts";

const g = (d: GateDefinition): GateDefinition => d;

// The move rules (the-flow.md §7). A corrective move carries a note that becomes the next step's instruction (GATE-5); a reject names its target (GATE-6).
const APPROVE: MoveRule = { note: "optional", leads: "next" };
const REVISE: MoveRule = { note: "required", leads: "same-gate" };
const REVISE_TO_WORKERS: MoveRule = { note: "required", leads: "workers-then-same-gate" };
const RESTART: MoveRule = { note: "required", leads: "rebuild-then-recross" };
/** A reject: a fresh author at this gate by default, or an earlier gate the move names. `roadmap` is allowed only at Concept and Merge. */
const reject = (opts: { roadmap?: boolean; default?: "same-gate" | "@build" } = {}): MoveRule => ({
  note: "required",
  leads: "same-gate",
  targets: { earlier: true, ...(opts.roadmap ? { roadmap: true } : {}), default: opts.default ?? "same-gate" },
});
const ROW_EDIT: MoveRule = { note: "optional", leads: "roadmap-edit" };

// The paths and labels that make a row an interface feature (ui-flow.md §4.1, §5.1: the same list for both gates).
const INTERFACE_WORK = {
  paths: ["web/**", "app/**", "**/*.tsx", "**/*.vue", "**/*.css", "design/**"],
  labels: ["ui"],
} as const satisfies AppliesWhen;

export const v2: FlowDefinition = {
  version: "v2",
  gates: [
    g({
      key: "gate0", name: "Roadmap gate", phase: "program",
      question: "Which feature next, in what order — and how does this factory run?",
      moves: ["approve", "revise", "reject", "edit-rows", "add-row", "drop-row"],
      // The admission crossing: a reject admits nothing and the walk ends (FR-027). Never delegable (constitution VI).
      rules: { approve: APPROVE, revise: REVISE, reject: { note: "required", leads: "not-admitted" }, "edit-rows": ROW_EDIT, "add-row": ROW_EDIT, "drop-row": ROW_EDIT },
      delegable: "never",
    }),
    g({
      key: "1-concept", name: "Concept", phase: "contract", question: "Is this worth building, on these premises?", moves: ["approve", "revise", "reject"],
      rules: { approve: APPROVE, revise: REVISE, reject: reject({ roadmap: true }) }, triage: "skippable", delegable: "never",
    }),
    g({
      key: "2-architecture", name: "Architecture", phase: "contract", question: "Is this the right structure?",
      moves: ["approve", "revise", "reject"], judge: "architecture-critic",
      rules: { approve: APPROVE, revise: REVISE, reject: reject() }, triage: "skippable", delegable: "never",
    }),
    g({
      key: "2a-experience", name: "Experience design", phase: "contract",
      question: "Is this the right experience for these users and journeys, within the charter?",
      moves: ["approve", "revise", "reject"], judge: "design-critic",
      appliesWhen: { ...INTERFACE_WORK, journeys: "any" },
      rules: { approve: APPROVE, revise: REVISE, reject: reject() }, delegable: "never",
    }),
    g({
      key: "3-spec", name: "Specification", phase: "contract", question: "What exactly counts as done?", moves: ["approve", "revise", "reject"],
      rules: { approve: APPROVE, revise: REVISE, reject: reject() }, armsTail: true, delegable: "never",
    }),
    g({
      key: "4-plan", name: "Work plan", phase: "contract", question: "In what pieces and order will it be built?", moves: ["approve", "revise", "reject"],
      rules: { approve: APPROVE, revise: REVISE, reject: reject() }, delegable: "default",
    }),
    // No reject: a restorable base, not "done wrong".
    g({
      key: "5-checkpoint", name: "Implementation", phase: "build-and-prove",
      question: "Do we start from a safe point — and is this still one feature?", moves: ["approve", "split+revise"],
      rules: { approve: APPROVE, "split+revise": { note: "required", leads: "split" } }, restorePoint: true, delegable: "default",
    }),
    // The reviewer judges, never authors: revise sends the findings to the workers; restart rebuilds from the restorable commit.
    g({
      key: "6-review", name: "Code review", phase: "build-and-prove",
      question: "Is the code right, measured against the specification?", moves: ["approve", "revise", "restart"], judge: "code-reviewer",
      rules: { approve: APPROVE, revise: REVISE_TO_WORKERS, restart: RESTART }, delegable: "default",
    }),
    g({
      key: "6a-ui-review", name: "UI review", phase: "build-and-prove",
      question: "Does the built interface match the approved experience, and is it accessible and consistent?",
      moves: ["approve", "revise", "restart"], judge: "ui-reviewer", check: "ui-checker",
      appliesWhen: { ...INTERFACE_WORK, diff: ["ui_files_changed", "tokens_changed", "routes_changed"] },
      rules: { approve: APPROVE, revise: REVISE_TO_WORKERS, restart: RESTART }, delegable: "never",
    }),
    // A reject auto-mitigates up to the cap (default 2, set 0–3 at the Roadmap gate), then a person waits.
    g({
      key: "7-verification", name: "Verification", phase: "build-and-prove", question: "Does it actually work as specified?",
      moves: ["approve", "reject"], automatic: ["mitigate"], judge: "verifier", mitigationCap: { default: 2, min: 0, max: 3 },
      // A person's reject with no target sends the work back to the code itself (the-flow.md §6, §11 P1); the automatic `mitigate` is the factory's, never a person's.
      rules: { approve: APPROVE, reject: reject({ default: "@build" }), mitigate: { note: "optional", leads: "same-gate" } }, delegable: "default",
    }),
    // The Documentation gate is unjudged since constitution v2.0.1.
    g({
      key: "8-docs", name: "Documentation", phase: "release", question: "Do the docs describe what was actually built?", moves: ["approve", "revise", "reject"],
      rules: { approve: APPROVE, revise: REVISE, reject: reject() }, delegable: "default",
    }),
    g({
      key: "9-pr", name: "Merge", phase: "release", question: "Do we ship it?", moves: ["approve", "reject"],
      rules: { approve: APPROVE, reject: reject({ roadmap: true }) }, delegable: "explicit",
    }),
  ],
  roster: {
    version: "v2",
    judges: ["architecture-critic", "design-critic", "code-reviewer", "ui-reviewer", "verifier"],
    producers: [
      "researcher", "concept-writer", "architecture-designer", "adr-maker", "ux-designer", "worker", "techwriter",
      "docs-synthesizer", "pr-writer", "feature-size-triage",
    ],
  },
};
