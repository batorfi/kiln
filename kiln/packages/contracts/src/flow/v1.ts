// Flow v1: the first program's rail, frozen as data. Copied key for key from legacy/contracts/move-vocabulary.ts
// (MOVE_VOCABULARY, GATE_NAME, MITIGATION_CAP) and legacy/src/roles.ts (the four judges, the producers).
import type { FlowDefinition, GateDefinition } from "./types.ts";

const g = (d: GateDefinition): GateDefinition => d;

export const v1: FlowDefinition = {
  version: "v1",
  gates: [
    g({ key: "gate0", name: "gate0", phase: "program", moves: ["approve", "revise", "reject", "edit-rows", "add-row", "drop-row"] }),
    g({ key: "1-concept", name: "concept", phase: "contract", moves: ["approve", "revise", "reject"] }),
    g({ key: "2-architecture", name: "architecture", phase: "contract", moves: ["approve", "revise", "reject"], judge: "architecture-critic" }),
    g({ key: "3-spec", name: "spec", phase: "contract", moves: ["approve", "revise", "reject"] }),
    g({ key: "4-plan", name: "plan", phase: "contract", moves: ["approve", "revise", "reject"] }),
    // G5: the one "grow" move; no reject (a restorable base, not "done wrong").
    g({ key: "5-checkpoint", name: "checkpoint", phase: "build-and-prove", moves: ["approve", "split+revise"] }),
    // G5: the reviewer judges, never authors: no revise; the corrective move is restart.
    g({ key: "6-review", name: "review", phase: "build-and-prove", moves: ["approve", "restart"], judge: "code-reviewer" }),
    // G4/G5: approve/reject; reject auto-mitigates up to the cap (fixed at 2 in v1), then a person waits.
    g({
      key: "7-verification", name: "verification", phase: "build-and-prove", moves: ["approve", "reject"],
      judge: "verifier", mitigationCap: { default: 2, min: 2, max: 2 },
    }),
    g({ key: "8-docs", name: "docs", phase: "release", moves: ["approve", "revise", "reject"], judge: "docs-synthesizer" }),
    g({ key: "9-pr", name: "pull request", phase: "release", moves: ["approve", "reject"] }),
  ],
  roster: {
    version: "v1",
    judges: ["architecture-critic", "verifier", "code-reviewer", "docs-synthesizer"],
    producers: ["researcher", "concept-writer", "architecture-designer", "adr-maker", "worker", "techwriter", "pr-writer", "feature-size-triage"],
  },
};
