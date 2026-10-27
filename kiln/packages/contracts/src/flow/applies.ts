// `applies_when`, evaluated (research R7, contracts/flow-data.md §3). PURE: facts in, a verdict and its reason out — no model, no clock, no I/O. The same facts give the same bytes
// (the reason is canonical JSON), which is what lets the walk say "recorded exactly once" and a restart say "the same reason".
//
//   · OR across predicates: paths ∨ labels ∨ journeys (Experience design); paths ∨ labels at admission and the diff predicates at UI review's slot.
//   · A fact that was not supplied is `absent` and counts as FALSE — never a guess, never "apply by default" — and the reason says so.
//   · A gate a person REQUIRED applies whatever the rule says, and the reason still shows what the rule said.
//   · Only UI review can turn on after admission (`atUiSlot`), and nothing here ever turns an applicable gate off.
import type { GateKey } from "../moves.ts";
import { firstMatch } from "./glob.ts";
import type { AdmissionFacts, Applicability, BuiltFacts, GateDefinition, PredicateState, Reason } from "./types.ts";

const list = (xs: readonly string[]): string => `[${xs.join(", ")}]`;

/** Evaluates a gate's rule at ADMISSION (paths, labels, journeys — the diff is read later, at the slot). */
export function applicability(gate: GateDefinition, facts: AdmissionFacts, required: readonly GateKey[] = []): Applicability {
  const rule = gate.appliesWhen;
  if (!rule) return { gate: gate.key, applies: true, why: "unconditional" };

  const phrases: string[] = [];
  const evaluated: Reason["evaluated"] = {};
  const ruleShown: Reason["rule"] = {};
  let verdict = false;

  if (rule.paths) {
    ruleShown.paths = rule.paths;
    if (facts.paths === undefined) {
      evaluated.paths = "absent";
      phrases.push("no paths were supplied");
    } else {
      const hit = firstMatch(rule.paths, facts.paths);
      evaluated.paths = hit ? "match" : "no-match";
      phrases.push(hit ? `path "${hit.path}" matches "${hit.pattern}"` : `no path matches ${list(rule.paths)}`);
      if (hit) verdict = true;
    }
  }
  if (rule.labels) {
    ruleShown.labels = rule.labels;
    if (facts.labels === undefined) {
      evaluated.labels = "absent";
      phrases.push("no labels were supplied");
    } else {
      const hit = facts.labels.find((l) => rule.labels!.includes(l));
      evaluated.labels = hit !== undefined ? "match" : "no-match";
      phrases.push(hit !== undefined ? `label "${hit}" is one of ${list(rule.labels)}` : `no label is one of ${list(rule.labels)}`);
      if (hit !== undefined) verdict = true;
    }
  }
  if (rule.journeys) {
    ruleShown.journeys = rule.journeys;
    if (facts.journeys === undefined) {
      evaluated.journeys = "absent";
      phrases.push("no journeys were supplied");
    } else {
      const hit = facts.journeys[0];
      evaluated.journeys = hit !== undefined ? "match" : "no-match";
      phrases.push(hit !== undefined ? `the row cites journey "${hit}"` : "the row cites no journey");
      if (hit !== undefined) verdict = true;
    }
  }

  const reason: Reason = { rule: ruleShown, evaluated, verdict, text: `${verdict ? "applies" : "does not apply"}: ${phrases.join("; ")}` };
  if (required.includes(gate.key)) {
    return { gate: gate.key, applies: true, why: "required", reason: { ...reason, text: `required by a person at the Roadmap gate (the rule said: ${reason.text})` } };
  }
  return { gate: gate.key, applies: verdict, why: "rule", reason };
}

/**
 * UI review's slot: a gate pinned NOT applicable whose rule has diff predicates is looked at again on what was actually changed. Returns the new answer ONLY when the gate turns on; `null`
 * means nothing changes (it applied already, it was required, it has no diff rule — Experience design — or the predicates are false or were not supplied).
 */
export function atUiSlot(gate: GateDefinition, pinned: Applicability, built: BuiltFacts | undefined): Applicability | null {
  const diff = gate.appliesWhen?.diff;
  if (!diff || pinned.applies) return null;
  if (built === undefined) return null;
  const hit = diff.find((p) => (built as Record<string, boolean | undefined>)[p] === true);
  if (hit === undefined) return null;
  const reason: Reason = {
    rule: { diff },
    evaluated: { diff: "match" satisfies PredicateState },
    verdict: true,
    text: `applies: the changed files meet "${hit}" (the gate was pinned not applicable at admission)`,
  };
  return { gate: gate.key, applies: true, why: "became-applicable", reason };
}
