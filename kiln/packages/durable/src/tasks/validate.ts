// Input validation for the three shell kinds, as pure functions (so `tasks.create` can refuse by name before anything is written). The shells are SCRIPTED (research R8): nothing here reads flow
// data except the roadmap's gate; any new behaviour belongs to r14/r16/r18 and needs a spec line first.
import type { JSON } from "../types.ts";
import { checkWalk, FEATURE_PATTERN, type WalkInput } from "../walk/input.ts";

export interface UnitSpec {
  label: string;
  steps: number;
  needsLane?: boolean;
  /** With `needsLane`: the model the scripted generation needs resident, and whether the lane must hold it afterwards. */
  model?: string;
  hold?: boolean;
  /** Scripted duration of each step in ms (0–60000): the work a kill can interrupt. */
  stepMs?: number;
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
  const extra = only(v, ["label", "steps", "needsLane", "stepMs", "model", "hold"]);
  if (extra) return extra;
  if (typeof v.label !== "string" || v.label.trim() === "") return "a unit needs a label";
  if (!Number.isInteger(v.steps) || (v.steps as number) < 1 || (v.steps as number) > 100) return "steps is an integer from 1 to 100";
  if (v.needsLane !== undefined && typeof v.needsLane !== "boolean") return "needsLane is a boolean";
  if (v.model !== undefined && (typeof v.model !== "string" || v.model.trim() === "")) return "model is a non-empty string";
  if (v.hold !== undefined && typeof v.hold !== "boolean") return "hold is a boolean";
  if ((v.model !== undefined || v.hold !== undefined) && v.needsLane !== true) return "model and hold apply only to a unit with needsLane";
  if (v.stepMs !== undefined && (!Number.isInteger(v.stepMs) || (v.stepMs as number) < 0 || (v.stepMs as number) > 60_000)) return "stepMs is an integer from 0 to 60000";
  return null;
}
export function checkRow(v: unknown): string | null {
  if (!isObj(v)) return "a row's input is an object";
  const extra = only(v, ["feature", "script", "walk"]);
  if (extra) return extra;
  if (typeof v.feature !== "string" || v.feature.trim() === "") return "a row needs a feature";
  if (v.script !== undefined && v.walk !== undefined) return "a row has a script OR a walk, not both";
  if (v.walk !== undefined) {
    if (!FEATURE_PATTERN.test(v.feature)) return `a walk's feature name goes into gate ids: it matches ${FEATURE_PATTERN} (lower-case letters, digits, . _ -)`;
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
