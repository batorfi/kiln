// `WalkInput`: the `walk` form of `kiln.row`'s input (data-model §3.1, walk-contract §1). Validated BY NAME before anything is written, as the shells' inputs are; pure.
// Creating a walk also refuses to start on a flow that `kiln check flow` would refuse (FR-054): the same `validateFlow`, so the walk never runs a flow the check would have rejected.
import { flowOf } from "#contracts/flow/index.ts";
import { validateFlow } from "#contracts/flow/validate.ts";
import type { AdmissionFacts, BuiltFacts } from "#contracts/flow/types.ts";
import { BUILTIN_ORDER } from "#contracts/flow/validate.ts";
import type { GateKey } from "#contracts/moves.ts";

export interface WalkInput {
  /** Only the default flow is walked (FR-052): a record under v1 is never walked under v2, and v1 is never walked at all. */
  flow: "v2";
  /** Known at admission: what the feature touches. Supplied (the director, r18, will compute it). */
  facts: AdmissionFacts;
  /** Read once, at UI review's slot. */
  built?: BuiltFacts;
  /** A proposal, shown at the admission crossing; the person may override it. */
  triage?: { skip: boolean; reasoning: string };
  /** The scripted verifier's verdicts, consumed in order; default: always pass. */
  verifier?: ("pass" | "fail")[];
  /** Test knobs. `sameContent`: a fresh author at these gates yields identical content (research R9). `stepMs`: work a kill can interrupt. */
  script?: { sameContent?: GateKey[]; stepMs?: number };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const only = (o: Record<string, unknown>, allowed: string[]): string | null => {
  const extra = Object.keys(o).filter((k) => !allowed.includes(k));
  return extra.length ? `unknown field${extra.length > 1 ? "s" : ""}: ${extra.join(", ")}` : null;
};
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");

/** A feature name goes into gate ids (`gate:<feature>:<gate>:<round>`), so it stays inside the id pattern and has no colon. */
export const FEATURE_PATTERN = /^[a-z0-9][a-z0-9._-]{0,60}$/;

export function checkWalk(v: unknown): string | null {
  if (!isObj(v)) return "a walk's input is an object";
  const extra = only(v, ["flow", "facts", "built", "triage", "verifier", "script"]);
  if (extra) return `walk: ${extra}`;
  if (v.flow !== "v2") return `walk.flow must be "v2" (the default flow); ${JSON.stringify(v.flow)} is refused — a record under v1 is never walked under v2, and v1 is never walked`;
  if (!isObj(v.facts)) return "walk.facts is an object (paths, labels, journeys)";
  const fe = only(v.facts, ["paths", "labels", "journeys"]);
  if (fe) return `walk.facts: ${fe}`;
  for (const k of ["paths", "labels", "journeys"]) if (v.facts[k] !== undefined && !strings(v.facts[k])) return `walk.facts.${k} is a list of strings`;
  if (v.built !== undefined) {
    if (!isObj(v.built)) return "walk.built is an object";
    const be = only(v.built, ["ui_files_changed", "tokens_changed", "routes_changed"]);
    if (be) return `walk.built: ${be}`;
    for (const [k, x] of Object.entries(v.built)) if (typeof x !== "boolean") return `walk.built.${k} is true or false`;
  }
  if (v.triage !== undefined) {
    if (!isObj(v.triage)) return "walk.triage is an object";
    const te = only(v.triage, ["skip", "reasoning"]);
    if (te) return `walk.triage: ${te}`;
    if (typeof v.triage.skip !== "boolean") return "walk.triage.skip is true or false";
    if (v.triage.skip && (typeof v.triage.reasoning !== "string" || v.triage.reasoning.trim() === "")) return "walk.triage.reasoning is required when triage skips: a shortcut is a decision, and it is recorded with its reasoning";
  }
  if (v.verifier !== undefined && !(Array.isArray(v.verifier) && v.verifier.length <= 50 && v.verifier.every((x) => x === "pass" || x === "fail"))) return "walk.verifier is a list of at most 50 verdicts, each pass or fail";
  if (v.script !== undefined) {
    if (!isObj(v.script)) return "walk.script is an object";
    const se = only(v.script, ["sameContent", "stepMs"]);
    if (se) return `walk.script: ${se}`;
    if (v.script.sameContent !== undefined && !(strings(v.script.sameContent) && v.script.sameContent.every((k) => (BUILTIN_ORDER as readonly string[]).includes(k)))) return "walk.script.sameContent is a list of gate keys of the flow";
    if (v.script.stepMs !== undefined && (!Number.isInteger(v.script.stepMs) || (v.script.stepMs as number) < 0 || (v.script.stepMs as number) > 60_000)) return "walk.script.stepMs is an integer from 0 to 60000";
  }
  // FR-054: never start on a flow the check would refuse
  const faults = validateFlow(flowOf("v2"));
  if (faults.length) return `the flow is invalid, so no walk starts on it: ${faults.map((f) => `${f.code}${f.gate ? ` (${f.gate})` : ""}`).join(", ")}`;
  return null;
}
