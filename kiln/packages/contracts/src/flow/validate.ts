// `validateFlow`: every rule of FLOW-7 for the DEFAULT flow, as one pure function over the data (contracts/check-flow.md §2). All-or-nothing: it collects EVERY fault and returns them, never stopping at the
// first, so a flow with two mistakes is told about both. A fault is `{code, gate?, detail}`; the codes are stable names and each belongs to one rule. `kiln check flow` turns them into failures;
// the engine, the walk and the drift test never need to ask whether a flow is valid — the check has already refused one that is not.
import { MOVE_KINDS, type GateKey, type MoveKind } from "../moves.ts";
import { globProblem } from "./glob.ts";
import type { FlowDefinition, GateDefinition } from "./types.ts";
import type { Fault } from "./types.ts";

/** The built-in gates in the constitution's order (The Flow & The Roadmap). */
export const BUILTIN_ORDER: readonly GateKey[] = ["gate0", "1-concept", "2-architecture", "2a-experience", "3-spec", "4-plan", "5-checkpoint", "6-review", "6a-ui-review", "7-verification", "8-docs", "9-pr"];
/** The two conditional (interface) gates and the gate each must follow directly. */
export const CONDITIONAL: Readonly<Record<string, GateKey>> = { "2a-experience": "2-architecture", "6a-ui-review": "6-review" };
const ROW_EDITS: readonly MoveKind[] = ["edit-rows", "add-row", "drop-row"];
const FEATURE_KINDS: readonly MoveKind[] = ["approve", "revise", "reject", "restart", "split+revise", "mitigate"];
const CORRECTIVE: readonly MoveKind[] = ["revise", "reject", "restart", "split+revise"];
const TRIAGE_ALLOWED: readonly GateKey[] = ["1-concept", "2-architecture"];
const ARMING_GATE: GateKey = "3-spec";

export function validateFlow(def: FlowDefinition): Fault[] {
  const faults: Fault[] = [];
  const add = (code: string, detail: string, gate?: GateKey): void => void faults.push({ code, detail, ...(gate ? { gate } : {}) });
  const gates = def?.gates ?? [];

  if (def?.version !== "v1" && def?.version !== "v2") add("flow-version", `the flow's version is "${String(def?.version)}"; it must be "v1" or "v2"`);
  if (gates.length === 0) {
    add("flow-vacuous", "the flow has no gates: a check that examined nothing proves nothing");
    return faults;
  }
  const keys = gates.map((g) => g.key as string);
  const at = (k: string): number => keys.indexOf(k);
  const isAdded = (g: GateDefinition): boolean => g.origin === "added";

  // ── placement: duplicates, anchors, presence, order ───────────────────────────────────────────────────────────────────────────────────────
  for (const k of new Set(keys.filter((k, i) => keys.indexOf(k) !== i))) add("flow-gate-duplicate", `the gate "${k}" appears more than once`, k as GateKey);
  if (keys[0] !== "gate0") add("flow-anchor-first", `the first gate is "${keys[0]}"; the Roadmap gate (gate0) is always first`);
  const merge = at("9-pr");
  if (merge < 0) add("flow-anchor-last", "there is no Merge gate (9-pr); Merge is always last");
  else if (merge !== keys.length - 1) add("flow-after-merge", `${keys.length - 1 - merge} gate(s) follow Merge (${keys.slice(merge + 1).join(", ")}); nothing comes after Merge`, "9-pr");
  for (const k of BUILTIN_ORDER) if (at(k) < 0) add("flow-builtin-missing", `the built-in gate "${k}" is missing; built-in gates are never removed`, k);
  for (const g of gates) if (!BUILTIN_ORDER.includes(g.key) && !isAdded(g)) add("flow-builtin-order", `"${g.key}" is neither a built-in gate nor marked origin "added"`, g.key);
  const present = BUILTIN_ORDER.filter((k) => at(k) >= 0);
  const actual = keys.filter((k) => BUILTIN_ORDER.includes(k as GateKey));
  for (let i = 0; i < present.length && i < actual.length; i++) {
    if (present[i] !== actual[i]) {
      add("flow-builtin-order", `"${actual[i]}" comes where "${present[i]}" belongs; the built-in gates keep the constitution's order`, actual[i] as GateKey);
      break;
    }
  }

  // ── conditional (interface) gates ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  for (const g of gates) {
    const conditional = g.key in CONDITIONAL;
    if (g.appliesWhen && !conditional) add("flow-conditional-unexpected", `"${g.key}" carries applies_when, but only the two interface gates may`, g.key);
    if (conditional && !g.appliesWhen) add("flow-conditional-unexpected", `the interface gate "${g.key}" carries no applies_when rule`, g.key);
    if (conditional && at(CONDITIONAL[g.key]) >= 0 && at(g.key) !== at(CONDITIONAL[g.key]) + 1) add("flow-conditional-placement", `"${g.key}" must come directly after "${CONDITIONAL[g.key]}"`, g.key);
    for (const p of g.appliesWhen?.paths ?? []) {
      const problem = globProblem(p);
      if (problem) add("flow-glob-unsupported", `applies_when path ${JSON.stringify(p)}: ${problem}`, g.key);
    }
  }

  // ── roles and judges ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const judges = def.roster?.judges ?? [];
  const producers = def.roster?.producers ?? [];
  for (const g of gates) {
    if (g.judge === undefined) continue;
    if (producers.includes(g.judge) && !judges.includes(g.judge)) add("flow-judge-not-judge", `"${g.judge}" is a producer role, not a judge, yet it judges "${g.key}"`, g.key);
    else if (!judges.includes(g.judge)) add("flow-role-unknown", `the judge "${g.judge}" of "${g.key}" is not in the roster`, g.key);
  }

  // ── move kinds, scope and rules ───────────────────────────────────────────────────────────────────────────────────────────────────────────
  const restoreAt = gates.findIndex((g) => g.restorePoint === true);
  for (const g of gates) {
    const here = at(g.key);
    for (const kind of g.moves) {
      if (!(MOVE_KINDS as readonly string[]).includes(kind)) {
        add("flow-move-kind-unknown", `"${String(kind)}" is not one of the closed set of move kinds`, g.key);
        continue;
      }
      if (kind === "mitigate") {
        add("flow-mitigate-person-move", `"mitigate" is the factory's automatic fix round and may not be among a person's moves`, g.key);
        continue;
      }
      if (g.key === "gate0" ? FEATURE_KINDS.includes(kind) && !["approve", "revise", "reject"].includes(kind) : ROW_EDITS.includes(kind)) {
        add("flow-move-wrong-scope", `"${kind}" does not belong at ${g.key === "gate0" ? "the Roadmap gate" : "a feature gate"}; the program gate and a feature's gates are never conflated`, g.key);
      }
    }
    const kinds = [...g.moves, ...(g.automatic ?? [])] as MoveKind[];
    for (const kind of kinds) {
      if (!(MOVE_KINDS as readonly string[]).includes(kind)) continue;
      const r = g.rules?.[kind];
      if (!r) {
        add("flow-rule-missing", `"${kind}" at "${g.key}" has no rule (its note, where it leads)`, g.key);
        continue;
      }
      if (CORRECTIVE.includes(kind) && r.note !== "required") add("flow-note-not-required", `"${kind}" at "${g.key}" is corrective: its note must be required`, g.key);
      if (kind === "reject" && g.key !== "gate0") {
        const t = r.targets;
        if (!t || t.earlier !== true) add("flow-returns-to-invalid", `the reject at "${g.key}" does not name earlier gates as its targets (a reject only ever goes back)`, g.key);
        else {
          if (t.default !== "same-gate" && t.default !== "@build") add("flow-returns-to-invalid", `the reject at "${g.key}" defaults to ${JSON.stringify(t.default)}; it must be same-gate or @build (never a later gate, never itself by name)`, g.key);
          if (t.default === "@build" && !(restoreAt >= 0 && here > restoreAt)) add("flow-returns-to-invalid", `the reject at "${g.key}" defaults to @build, but no restore point comes before it`, g.key);
          if (t.roadmap && g.key !== "1-concept" && g.key !== "9-pr") add("flow-returns-to-invalid", `the reject at "${g.key}" may name the roadmap, but only Concept and Merge may`, g.key);
        }
      }
    }
    if (g.moves.includes("restart") && !(restoreAt >= 0 && here > restoreAt)) add("flow-restart-no-restore-point", `"${g.key}" offers restart, but no gate before it marks a restore point to rebuild from`, g.key);
    const mitigates = (g.automatic ?? []).includes("mitigate");
    if (mitigates && !g.mitigationCap) add("flow-mitigate-no-cap", `"${g.key}" runs automatic fix rounds but states no cap`, g.key);
    const c = g.mitigationCap;
    if (c && !(Number.isInteger(c.min) && Number.isInteger(c.max) && Number.isInteger(c.default) && c.min >= 0 && c.max <= 3 && c.min <= c.default && c.default <= c.max)) {
      add("flow-mitigate-cap-invalid", `the fix-round cap of "${g.key}" is {default ${c.default}, min ${c.min}, max ${c.max}}; it must be integers with 0 ≤ min ≤ default ≤ max ≤ 3`, g.key);
    }
  }

  // ── triage ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  for (const g of gates) if (g.triage === "skippable" && !TRIAGE_ALLOWED.includes(g.key)) add("flow-triage-forbidden", `triage may skip Concept and Architecture only; "${g.key}" is marked skippable`, g.key);

  // ── arming and delegability ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const armers = gates.filter((g) => g.armsTail);
  for (const g of armers) {
    if (g.key === "gate0") add("flow-arming-roadmap", "the Roadmap gate may never arm the unattended tail (constitution VI)", g.key);
    if (isAdded(g)) add("flow-arming-added-gate", `"${g.key}" is an added gate; an added gate is never an arming point`, g.key);
  }
  const legit = armers.filter((g) => g.key !== "gate0" && !isAdded(g));
  if (legit.length !== 1 || legit[0].key !== ARMING_GATE) add("flow-arming-point", `the tail may be armed at the Specification gate only; the flow arms it at ${legit.length === 0 ? "no gate" : legit.map((g) => `"${g.key}"`).join(" and ")}`);
  const armIndex = at(ARMING_GATE);
  for (const g of gates) {
    const here = at(g.key);
    const mustNever = g.key === "gate0" || g.key in CONDITIONAL || (armIndex >= 0 && here <= armIndex);
    if (mustNever && g.delegable !== "never") add("flow-delegable-invalid", `"${g.key}" is the Roadmap gate, an interface gate or at/before the arming point: it must be delegable "never" (found ${JSON.stringify(g.delegable)})`, g.key);
    if (!mustNever && g.delegable === undefined) add("flow-delegable-invalid", `"${g.key}" does not say whether it can be crossed under delegation`, g.key);
    if (g.key === "9-pr" && g.delegable === "default") add("flow-delegable-invalid", `Merge is excluded from the tail unless explicitly delegated: "default" is not allowed`, g.key);
  }

  // ── cycles in the placement graph (added gates reference where they sit) ──────────────────────────────────────────────────────────────────
  const after = new Map<string, string>();
  for (const g of gates) if (g.after !== undefined) after.set(g.key, g.after);
  for (const [k, a] of after) if (!keys.includes(a)) add("flow-builtin-order", `"${k}" sits after "${a}", which the flow does not have`, k as GateKey);
  const reported = new Set<string>();
  for (const start of after.keys()) {
    const seen: string[] = [];
    let cur: string | undefined = start;
    while (cur !== undefined && after.has(cur)) {
      if (seen.includes(cur)) {
        const loop = seen.slice(seen.indexOf(cur));
        const id = [...loop].sort().join(">");
        if (!reported.has(id)) {
          reported.add(id);
          add("flow-cycle", `the placement of ${loop.map((k) => `"${k}"`).join(" → ")} loops back on itself`, cur as GateKey);
        }
        break;
      }
      seen.push(cur);
      cur = after.get(cur);
    }
  }
  return faults;
}
