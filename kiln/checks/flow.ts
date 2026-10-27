// `kiln check flow` (r14, FLOW-7 for the default flow; contracts/check-flow.md): validates the standard flow's DATA — anchors, placement, roles and judges, move kinds, `returns_to`, restart and mitigate
// prerequisites, arming points, triage, cycles — all-or-nothing. It calls the pure `validateFlow` and reports EVERY fault it finds before failing. Never vacuous: a flow with no gates fails
// (`flow-vacuous`), and every run says how many gates it examined. It imports `contracts` only — it never loads the durable package or the library.
import { flowOf } from "#contracts/flow/index.ts";
import type { FlowDefinition } from "#contracts/flow/types.ts";
import { validateFlow } from "#contracts/flow/validate.ts";
import type { CheckResult } from "./index.ts";

export interface FlowCheckOptions {
  /** The flow to check (default: the shipped v2). Tests hand in mutated copies. */
  flow?: FlowDefinition;
}

/** Where the shipped flow's data lives, relative to kiln/. */
const DATA_FILE = "packages/contracts/src/flow/v2.ts";

export function checkFlow(opts: FlowCheckOptions = {}): CheckResult {
  const shipped = opts.flow === undefined;
  const flow = opts.flow ?? flowOf("v2");
  if (flow.version === "v1") {
    return {
      name: "flow", ok: false, scanned: 0, notes: [],
      failures: [{ code: "flow-version", detail: "the check is for the default flow (v2); v1 is the first program's frozen rail, kept as data so its records stay verifiable, and is not validated here" }],
    };
  }
  const faults = validateFlow(flow);
  const gates = flow.gates?.length ?? 0;
  return {
    name: "flow",
    ok: faults.length === 0,
    failures: faults.map((f) => ({ code: f.code, ...(shipped ? { file: DATA_FILE } : {}), detail: `${f.gate ? `${f.gate}: ` : ""}${f.detail}` })),
    scanned: 1,
    notes: [`${gates} gates examined`],
  };
}
