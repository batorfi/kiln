// Input validation for the three shell kinds, as pure functions (so `tasks.create` can refuse by name before anything is written). The shells are SCRIPTED (research R8): nothing here reads flow
// data except the roadmap's gate; any new behaviour belongs to r14/r16/r18 and needs a spec line first.
import type { JSON } from "../types.ts";
import { checkWalk, FEATURE_PATTERN, type WalkInput } from "../walk/input.ts";

export interface UnitSpec {
  label: string;
  steps: number;
  needsLane?: boolean;
  /** With `needsLane`: the model the scripted generation needs resident, and whether the lane must hold it afterwards. With `role` (r16): the real model the conversation runs on — same field, same meaning, now also used for real. */
  model?: string;
  hold?: boolean;
  /** Scripted duration of each step in ms (0–60000): the work a kill can interrupt. Unused when `role` is set. */
  stepMs?: number;
  /** r16 T019: a real role from `#workers/roster.ts`'s provisional roster — replaces the scripted stand-in with a real conversation. Requires `needsLane`, `model` and `workspace`; `steps` must be 1 (T018's `runTurn` finishes synchronously within one call — `"continue"`'s pausing is T023's, not yet exercised). */
  role?: string;
  /** r16: the real conversation's tools' working directory. Required with `role`. */
  workspace?: string;
  /** r16: explicit, recorded references the real conversation is told about — never raw text (FR-002). Optional; defaults to none. */
  inputs?: string[];
}
/** A row is EITHER the r13 scripted list of units OR (r14) a walk of the flow — exactly one. */
export type RowInput = { feature: string; script: UnitSpec[]; walk?: undefined } | { feature: string; walk: WalkInput; script?: undefined };
export interface RoadmapInput {
  factory: string;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const only = (o: Record<string, unknown>, allowed: string[]): string | null => {
  const extra = Object.keys(o).filter((k) => !allowed.includes(k));
  return extra.length ? `unknown field${extra.length > 1 ? "s" : ""}: ${extra.join(", ")}` : null;
};

export function checkUnit(v: unknown): string | null {
  if (!isObj(v)) return "a unit's input is an object";
  const extra = only(v, ["label", "steps", "needsLane", "stepMs", "model", "hold", "role", "workspace", "inputs"]);
  if (extra) return extra;
  if (typeof v.label !== "string" || v.label.trim() === "") return "a unit needs a label";
  if (!Number.isInteger(v.steps) || (v.steps as number) < 1 || (v.steps as number) > 100) return "steps is an integer from 1 to 100";
  if (v.needsLane !== undefined && typeof v.needsLane !== "boolean") return "needsLane is a boolean";
  if (v.model !== undefined && (typeof v.model !== "string" || v.model.trim() === "")) return "model is a non-empty string";
  if (v.hold !== undefined && typeof v.hold !== "boolean") return "hold is a boolean";
  if ((v.model !== undefined || v.hold !== undefined) && v.needsLane !== true) return "model and hold apply only to a unit with needsLane";
  if (v.stepMs !== undefined && (!Number.isInteger(v.stepMs) || (v.stepMs as number) < 0 || (v.stepMs as number) > 60_000)) return "stepMs is an integer from 0 to 60000";
  if (v.role !== undefined) {
    if (typeof v.role !== "string" || v.role.trim() === "") return "role is a non-empty string";
    if (v.needsLane !== true) return "role requires needsLane";
    if (v.model === undefined) return "role requires model";
    if (v.workspace === undefined || typeof v.workspace !== "string" || v.workspace.trim() === "") return "role requires a non-empty workspace";
    if (v.steps !== 1) return "role requires steps to be exactly 1 (runTurn finishes synchronously within one call; T023 is what gives it something to pause with)";
  }
  if (v.workspace !== undefined && (typeof v.workspace !== "string" || v.workspace.trim() === "")) return "workspace is a non-empty string";
  if (v.workspace !== undefined && v.role === undefined) return "workspace applies only to a unit with role";
  if (v.inputs !== undefined) {
    if (!Array.isArray(v.inputs) || !v.inputs.every((i) => typeof i === "string")) return "inputs is an array of strings";
    if (v.role === undefined) return "inputs applies only to a unit with role";
  }
  return null;
}
const RESERVED_FEATURES: readonly string[] = ["lane"];
export function checkRow(v: unknown): string | null {
  if (!isObj(v)) return "a row's input is an object";
  const extra = only(v, ["feature", "script", "walk"]);
  if (extra) return extra;
  if (typeof v.feature !== "string" || v.feature.trim() === "") return "a row needs a feature";
  if (v.script !== undefined && v.walk !== undefined) return "a row has a script OR a walk, not both";
  if (v.walk !== undefined) {
    if (!FEATURE_PATTERN.test(v.feature)) return `a walk's feature name goes into gate ids: it matches ${FEATURE_PATTERN} (lower-case letters, digits, . _ -)`;
    if (RESERVED_FEATURES.includes(v.feature)) return `"${v.feature}" is reserved: the owner's own entries are recorded under it`;
    return checkWalk(v.walk);
  }
  if (!Array.isArray(v.script) || v.script.length > 50) return "script is a list of at most 50 unit specs (or give a walk)";
  for (const [i, u] of v.script.entries()) {
    const bad = checkUnit(u);
    if (bad) return `script[${i}]: ${bad}`;
  }
  return null;
}
/** The roadmap task has NO delegation field, by construction (constitution VI): its input is exactly `{factory}`, and any other field — a delegation among them — is refused by name. */
export function checkRoadmap(v: unknown): string | null {
  if (!isObj(v)) return "a roadmap's input is an object";
  const extra = only(v, ["factory"]);
  if (extra) return `${extra} — the Roadmap gate accepts no delegation and no other parameter`;
  if (typeof v.factory !== "string" || v.factory.trim() === "") return "a roadmap needs the factory it belongs to";
  return null;
}
export const asJson = (v: unknown): JSON => v as JSON;
