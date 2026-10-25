// Flow v2: the standard flow of constitution v2.1.0 — the Roadmap gate and eleven feature gates (r12 T049; contracts/flow-and-records.md §2).
// DATA ONLY. The two interface gates DECLARE their `applies_when` rule (docs/concepts/ui-flow.md §4.1, §5.1); evaluating it and recording a
// gate as *not applicable* belong to r14/r15. Internal keys are the first program's, plus `2a-experience` and `6a-ui-review`.
// tests/flow-vs-constitution.test.ts reads the constitution, the PRD and ui-flow.md and fails if this file drifts from them.
import type { AppliesWhen, FlowDefinition, GateDefinition } from "./types.ts";

const g = (d: GateDefinition): GateDefinition => d;

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
    }),
    g({ key: "1-concept", name: "Concept", phase: "contract", question: "Is this worth building, on these premises?", moves: ["approve", "revise", "reject"] }),
    g({
      key: "2-architecture", name: "Architecture", phase: "contract", question: "Is this the right structure?",
      moves: ["approve", "revise", "reject"], judge: "architecture-critic",
    }),
    g({
      key: "2a-experience", name: "Experience design", phase: "contract",
      question: "Is this the right experience for these users and journeys, within the charter?",
      moves: ["approve", "revise", "reject"], judge: "design-critic",
      appliesWhen: { ...INTERFACE_WORK, journeys: "any" },
    }),
    g({ key: "3-spec", name: "Specification", phase: "contract", question: "What exactly counts as done?", moves: ["approve", "revise", "reject"] }),
    g({ key: "4-plan", name: "Work plan", phase: "contract", question: "In what pieces and order will it be built?", moves: ["approve", "revise", "reject"] }),
    // No reject: a restorable base, not "done wrong".
    g({
      key: "5-checkpoint", name: "Implementation", phase: "build-and-prove",
      question: "Do we start from a safe point — and is this still one feature?", moves: ["approve", "split+revise"],
    }),
    // The reviewer judges, never authors: revise sends the findings to the workers; restart rebuilds from the restorable commit.
    g({
      key: "6-review", name: "Code review", phase: "build-and-prove",
      question: "Is the code right, measured against the specification?", moves: ["approve", "revise", "restart"], judge: "code-reviewer",
    }),
    g({
      key: "6a-ui-review", name: "UI review", phase: "build-and-prove",
      question: "Does the built interface match the approved experience, and is it accessible and consistent?",
      moves: ["approve", "revise", "restart"], judge: "ui-reviewer", check: "ui-checker",
      appliesWhen: { ...INTERFACE_WORK, diff: ["ui_files_changed", "tokens_changed", "routes_changed"] },
    }),
    // A reject auto-mitigates up to the cap (default 2, set 0–3 at the Roadmap gate), then a person waits.
    g({
      key: "7-verification", name: "Verification", phase: "build-and-prove", question: "Does it actually work as specified?",
      moves: ["approve", "reject"], automatic: ["mitigate"], judge: "verifier", mitigationCap: { default: 2, min: 0, max: 3 },
    }),
    // The Documentation gate is unjudged since constitution v2.0.1.
    g({ key: "8-docs", name: "Documentation", phase: "release", question: "Do the docs describe what was actually built?", moves: ["approve", "revise", "reject"] }),
    g({ key: "9-pr", name: "Merge", phase: "release", question: "Do we ship it?", moves: ["approve", "reject"] }),
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
