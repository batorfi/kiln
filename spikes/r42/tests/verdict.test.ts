// T021 — the verdict rules (contracts/spike-report.md §3), derived mechanically from the evidence. Never more favourable than the weakest claimed guarantee.
import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveVerdict } from "../src/verdict.ts";
import { GUARANTEES, type Evidence, type Guarantee, type GuaranteeStatus, type StrategyEvidence } from "../src/evidence-model.ts";
import type { Caveat } from "../src/strategy.ts";

function strat(name: string, over: { native?: boolean; testOnly?: boolean; status?: GuaranteeStatus | Partial<Record<Guarantee, GuaranteeStatus>>; caveats?: Caveat[] }): StrategyEvidence {
  const s = over.status ?? "held";
  const g = Object.fromEntries(GUARANTEES.map((k) => [k, { status: typeof s === "string" ? s : (s[k] ?? "held"), scenarios: 3, ran: 3, passed: 3, violated: [] }])) as StrategyEvidence["guarantees"];
  return { name, native: over.native ?? false, testOnly: over.testOnly ?? false, killPoints: [{ name: "p", phase: "move" }], exercised: 1, randomKills: 0, caveats: over.caveats ?? [], guarantees: g, notes: [] };
}
const evidence = (...strategies: StrategyEvidence[]): Evidence => ({
  piDurable: { name: "@earendil-works/pi-durable", version: "1.4.0", integrity: "sha512-x" },
  node: "v25.9.0", platform: "darwin", startedAt: "2026-10-26T08:00:00Z", finishedAt: "2026-10-26T08:10:00Z",
  strategies: Object.fromEntries(strategies.map((s) => [s.name, s])),
});

test("V1 a native strategy holds a–e and every caveat it declares is enforceable ⇒ go", () => {
  const v = deriveVerdict(evidence(strat("native-signal", { native: true, caveats: [{ text: "d holds only with restartLimit = Infinity", enforceable: true }] })));
  assert.equal(v.verdict, "go");
  assert.ok(v.because.some((b) => b.includes("native-signal")));
  assert.ok(v.because.some((b) => b.includes("restartLimit")), "the enforceable caveat is quoted in the reasons");
});

test("V2 a native strategy holds a–e but a caveat is NOT enforceable ⇒ not a go; with a fallback holding a–e ⇒ go-with-fallback", () => {
  const nonEnforceable = strat("native-signal", { native: true, caveats: [{ text: "relies on the caller never restarting twice", enforceable: false }] });
  assert.equal(deriveVerdict(evidence(nonEnforceable, strat("fallback-document", {}))).verdict, "go-with-fallback");
  assert.equal(deriveVerdict(evidence(nonEnforceable)).verdict, "no-go", "and with no fallback there is nothing to fall back to");
});

test("V3 no native strategy qualifies, a fallback holds a–e ⇒ go-with-fallback", () => {
  const v = deriveVerdict(evidence(strat("native-signal", { native: true, status: { a: "not-held" } }), strat("native-abort", { native: true, status: { a: "not-held", d: "not-held" } }), strat("fallback-document", {})));
  assert.equal(v.verdict, "go-with-fallback");
  assert.ok(v.because.some((b) => b.includes("fallback-document")));
});

test("V4 nothing holds a–e ⇒ no-go", () => {
  assert.equal(deriveVerdict(evidence(strat("native-signal", { native: true, status: { a: "not-held" } }), strat("fallback-document", { status: { c: "not-held" } }))).verdict, "no-go");
  assert.equal(deriveVerdict(evidence()).verdict, "no-go", "no candidate at all");
});

test("V5 never more favourable than the weakest claimed guarantee: one NOT-PROVEN guarantee is enough to withhold a go", () => {
  const almost = strat("native-signal", { native: true, status: { e: "not-proven" } });
  assert.equal(deriveVerdict(evidence(almost)).verdict, "no-go");
  assert.equal(deriveVerdict(evidence(almost, strat("fallback-document", {}))).verdict, "go-with-fallback");
});

test("V6 test-only controls never count: a perfect control-sqlite alone is not a verdict", () => {
  assert.equal(deriveVerdict(evidence(strat("control-sqlite", { testOnly: true }))).verdict, "no-go");
  assert.equal(deriveVerdict(evidence(strat("control-sqlite", { testOnly: true }), strat("native-signal", { native: true, status: "not-held" }))).verdict, "no-go");
});

test("V7 a non-native strategy that is not test-only (a fallback) cannot produce a plain go", () => {
  assert.equal(deriveVerdict(evidence(strat("fallback-table", {}))).verdict, "go-with-fallback");
});

test("V8 'because' is a non-empty list of reasons a person can quote", () => {
  for (const e of [evidence(strat("native-signal", { native: true })), evidence(strat("fallback-document", {})), evidence()]) {
    const v = deriveVerdict(e);
    assert.ok(v.because.length > 0 && v.because.every((b) => typeof b === "string" && b.length > 0));
  }
});
