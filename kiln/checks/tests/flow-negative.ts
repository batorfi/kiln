// The negative suite of `kiln check flow` (r14 T017, contracts/check-flow.md §3): deliberately INVALID flows, one per rule, each made by mutating a deep copy of the shipped v2 — so the flow data and
// its faults cannot drift apart (a fault that stops being a fault is a test failure, and so is a rule nobody tries to break). A check that cannot refuse these proves nothing about the real flow.
// Not a test file itself: `flow-check.test.ts` runs it. `runNegativeSuite(check)` takes ANY checker, so the tests can also hand it a stub that accepts everything and see the suite fail.
import { flowOf } from "#contracts/flow/index.ts";
import type { FlowDefinition, GateDefinition } from "#contracts/flow/types.ts";
import type { GateKey } from "#contracts/moves.ts";

/** Every code of contracts/check-flow.md §2. A code `validateFlow` emits that is not listed here, or listed here with no member below, fails `flow-check.test.ts`. */
export const ALL_CODES = [
  "flow-anchor-first", "flow-anchor-last", "flow-after-merge",
  "flow-builtin-missing", "flow-builtin-order", "flow-gate-duplicate",
  "flow-conditional-placement", "flow-conditional-unexpected", "flow-glob-unsupported",
  "flow-role-unknown", "flow-judge-not-judge",
  "flow-move-kind-unknown", "flow-move-wrong-scope", "flow-mitigate-person-move", "flow-rule-missing", "flow-note-not-required",
  "flow-returns-to-invalid", "flow-restart-no-restore-point", "flow-mitigate-cap-invalid", "flow-mitigate-no-cap",
  "flow-triage-forbidden", "flow-arming-point", "flow-arming-roadmap", "flow-arming-added-gate", "flow-delegable-invalid",
  "flow-cycle", "flow-vacuous", "flow-version",
] as const;

export interface NegativeMember {
  /** The rule of FLOW-7 this member breaks, in words. */
  rule: string;
  /** The codes the check must report (all of them: the multi-fault members list several). */
  codes: string[];
  /** Codes that are an unavoidable CONSEQUENCE of the mutation (removing a gate also leaves its neighbours misplaced). Anything else reported is noise and fails the suite. */
  also?: string[];
  mutate(def: FlowDefinition): FlowDefinition;
}

// A JSON round trip, not structuredClone: v2 shares its rule objects between gates (APPROVE, REVISE …) and structuredClone keeps that sharing, so "change one gate's rule" would change them all.
const pristine = (): FlowDefinition => JSON.parse(JSON.stringify(flowOf("v2"))) as FlowDefinition;
const gate = (d: FlowDefinition, key: GateKey): GateDefinition => {
  const g = d.gates.find((x) => x.key === key);
  if (!g) throw new Error(`the shipped flow has no gate ${key}`);
  return g;
};
const edit = (fn: (d: FlowDefinition) => void) => (d: FlowDefinition): FlowDefinition => (fn(d), d);
const remove = (d: FlowDefinition, key: GateKey): void => void (d.gates = d.gates.filter((g) => g.key !== key));
const extra = (key: string, over: Partial<GateDefinition> = {}): GateDefinition => ({
  key: key as GateKey, name: key, phase: "contract", moves: ["approve"], rules: { approve: { note: "optional", leads: "next" } }, delegable: "never", origin: "added", ...over,
});

export const NEGATIVE: NegativeMember[] = [
  { rule: "the Roadmap gate is first", codes: ["flow-anchor-first"], also: ["flow-builtin-order"], mutate: edit((d) => d.gates.unshift(d.gates.splice(1, 1)[0])) },
  { rule: "Merge is last (it is missing)", codes: ["flow-anchor-last", "flow-builtin-missing"], also: ["flow-builtin-order"], mutate: edit((d) => remove(d, "9-pr")) },
  { rule: "nothing comes after Merge", codes: ["flow-after-merge"], also: ["flow-cycle"], mutate: edit((d) => d.gates.push(extra("x-after-merge"))) },
  { rule: "no built-in gate is ever removed", codes: ["flow-builtin-missing"], also: ["flow-conditional-placement"], mutate: edit((d) => remove(d, "4-plan")) },
  { rule: "built-in gates keep the constitution's order", codes: ["flow-builtin-order"], also: ["flow-delegable-invalid"], mutate: edit((d) => d.gates.splice(4, 2, d.gates[5], d.gates[4])) },
  { rule: "a gate appears once", codes: ["flow-gate-duplicate"], also: ["flow-builtin-order"], mutate: edit((d) => d.gates.splice(6, 0, structuredClone(gate(d, "4-plan")))) },
  { rule: "Experience design sits directly after Architecture", codes: ["flow-conditional-placement"], also: ["flow-builtin-order"], mutate: edit((d) => d.gates.splice(5, 0, d.gates.splice(3, 1)[0])) },
  { rule: "only the two interface gates carry applies_when", codes: ["flow-conditional-unexpected"], mutate: edit((d) => (gate(d, "4-plan").appliesWhen = { labels: ["ui"] })) },
  { rule: "an interface gate carries applies_when", codes: ["flow-conditional-unexpected"], mutate: edit((d) => delete gate(d, "6a-ui-review").appliesWhen) },
  { rule: "applies_when globs stay inside the dialect", codes: ["flow-glob-unsupported"], mutate: edit((d) => (gate(d, "2a-experience").appliesWhen = { paths: ["web/{a,b}/**"], labels: ["ui"] })) },
  { rule: "a judge is a role of the roster", codes: ["flow-role-unknown"], mutate: edit((d) => (gate(d, "2-architecture").judge = "nobody-in-particular")) },
  { rule: "a gate's judge is a judge, not a producer", codes: ["flow-judge-not-judge"], mutate: edit((d) => (gate(d, "6-review").judge = "worker")) },
  { rule: "move kinds are the closed set", codes: ["flow-move-kind-unknown"], also: ["flow-rule-missing"], mutate: edit((d) => gate(d, "1-concept").moves.push("veto" as never)) },
  { rule: "a row edit belongs to the Roadmap gate only", codes: ["flow-move-wrong-scope"], also: ["flow-rule-missing"], mutate: edit((d) => gate(d, "4-plan").moves.push("edit-rows" as never)) },
  { rule: "mitigate is never a person's move", codes: ["flow-mitigate-person-move"], mutate: edit((d) => gate(d, "7-verification").moves.push("mitigate" as never)) },
  { rule: "every move has a rule", codes: ["flow-rule-missing"], mutate: edit((d) => delete gate(d, "1-concept").rules!.revise) },
  { rule: "a corrective move requires a note", codes: ["flow-note-not-required"], mutate: edit((d) => (gate(d, "1-concept").rules!.revise!.note = "optional")) },
  { rule: "a reject never defaults to a later gate", codes: ["flow-returns-to-invalid"], mutate: edit((d) => (gate(d, "3-spec").rules!.reject!.targets!.default = "9-pr" as never)) },
  { rule: "a reject only ever goes back", codes: ["flow-returns-to-invalid"], mutate: edit((d) => (gate(d, "3-spec").rules!.reject!.targets!.earlier = false as never)) },
  { rule: "the roadmap is a target at Concept and Merge only", codes: ["flow-returns-to-invalid"], mutate: edit((d) => (gate(d, "4-plan").rules!.reject!.targets!.roadmap = true)) },
  { rule: "@build exists only after the restore point", codes: ["flow-returns-to-invalid"], mutate: edit((d) => (gate(d, "4-plan").rules!.reject!.targets!.default = "@build")) },
  { rule: "restart needs a restore point to rebuild from", codes: ["flow-restart-no-restore-point"], also: ["flow-returns-to-invalid"], mutate: edit((d) => delete gate(d, "5-checkpoint").restorePoint) },
  { rule: "the fix-round cap is within 0–3", codes: ["flow-mitigate-cap-invalid"], mutate: edit((d) => (gate(d, "7-verification").mitigationCap = { default: 2, min: 0, max: 5 })) },
  { rule: "automatic fix rounds state a cap", codes: ["flow-mitigate-no-cap"], mutate: edit((d) => delete gate(d, "7-verification").mitigationCap) },
  { rule: "triage may never skip Documentation", codes: ["flow-triage-forbidden"], mutate: edit((d) => (gate(d, "8-docs").triage = "skippable")) },
  { rule: "the tail is armed at Specification (it is armed nowhere)", codes: ["flow-arming-point"], mutate: edit((d) => delete gate(d, "3-spec").armsTail) },
  { rule: "the tail is armed at Specification (it is armed at Work plan)", codes: ["flow-arming-point"], mutate: edit((d) => { delete gate(d, "3-spec").armsTail; gate(d, "4-plan").armsTail = true; }) },
  { rule: "the tail is armed at ONE gate (two)", codes: ["flow-arming-point"], mutate: edit((d) => (gate(d, "4-plan").armsTail = true)) },
  { rule: "the Roadmap gate never arms the tail", codes: ["flow-arming-roadmap"], mutate: edit((d) => (gate(d, "gate0").armsTail = true)) },
  { rule: "an added gate is never an arming point", codes: ["flow-arming-added-gate"], also: ["flow-cycle"], mutate: edit((d) => d.gates.splice(6, 0, extra("x-added", { armsTail: true, after: "4-plan" }))) },
  { rule: "the Roadmap gate, the interface gates and everything up to the arming point are never delegable", codes: ["flow-delegable-invalid"], mutate: edit((d) => (gate(d, "1-concept").delegable = "default")) },
  { rule: "Merge is excluded from the tail unless explicitly delegated", codes: ["flow-delegable-invalid"], mutate: edit((d) => (gate(d, "9-pr").delegable = "default")) },
  { rule: "the placement graph has no cycle", codes: ["flow-cycle"], mutate: edit((d) => d.gates.splice(6, 0, extra("x-a", { after: "x-b" as GateKey }), extra("x-b", { after: "x-a" as GateKey }))) },
  { rule: "a check examines something", codes: ["flow-vacuous"], mutate: edit((d) => (d.gates = [])) },
  { rule: "the version is one the program knows", codes: ["flow-version"], mutate: edit((d) => ((d as { version: string }).version = "v3")) },
  // two faults in one flow: the check reports BOTH
  { rule: "two faults — no Roadmap gate, and so also an anchor and a missing built-in", codes: ["flow-anchor-first", "flow-builtin-missing"], also: ["flow-builtin-order", "flow-delegable-invalid"], mutate: edit((d) => remove(d, "gate0")) },
  { rule: "three faults in different rules — Roadmap arming, a cap out of range, an unknown judge", codes: ["flow-arming-roadmap", "flow-mitigate-cap-invalid", "flow-role-unknown"], mutate: edit((d) => { gate(d, "gate0").armsTail = true; gate(d, "7-verification").mitigationCap = { default: 2, min: 0, max: 9 }; gate(d, "2-architecture").judge = "ghost"; }) },
];

/** What a checker answers: just enough to judge the suite. */
export type FlowChecker = (def: FlowDefinition) => { ok: boolean; codes: string[] };

export interface SuiteResult {
  /** Members the checker let through. */
  accepted: NegativeMember[];
  /** Members refused, but without every code they were built to trigger. */
  wrongCode: { member: NegativeMember; reported: string[] }[];
  /** Members refused with a code that neither is expected nor is a listed consequence. */
  noise: { member: NegativeMember; unexpected: string[] }[];
  /** Codes in ALL_CODES that no member exercises. */
  missed: string[];
}

export function runNegativeSuite(check: FlowChecker, members: NegativeMember[] = NEGATIVE): SuiteResult {
  const res: SuiteResult = { accepted: [], wrongCode: [], noise: [], missed: ALL_CODES.filter((c) => !members.some((m) => m.codes.includes(c))) };
  for (const m of members) {
    const r = check(m.mutate(pristine()));
    if (r.ok) {
      res.accepted.push(m);
      continue;
    }
    if (!m.codes.every((c) => r.codes.includes(c))) res.wrongCode.push({ member: m, reported: r.codes });
    const unexpected = r.codes.filter((c) => !m.codes.includes(c) && !(m.also ?? []).includes(c));
    if (unexpected.length) res.noise.push({ member: m, unexpected });
  }
  return res;
}
export const pristineFlow = pristine;
