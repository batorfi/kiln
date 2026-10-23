// kiln/tests/pi/seam.test.ts — T017, r8 · FR-006 · contracts/pi-seam.md S3, S3.1 · OFFLINE tier.
// The row's centre: EVERY measured non-answer shape must yield no-answer; only an explicit offered choice, from a mode that can ask, is answered.
import { test } from "node:test";
import assert from "node:assert/strict";
import { interpret } from "../../pi/outcome.ts";
import { SEAM_ROWS, checkInterpret } from "./_seam-rows.ts";

test("FR-006: the real seam matches EVERY row in the S3.1 truth table", () => {
  const failed = checkInterpret((raw, options, cap) => interpret(raw, options, cap));
  assert.deepEqual(failed, [], `these rows did not match: ${failed.join(", ")}`);
});

test("FR-006: order — cannot-ask is checked FIRST, so a headless mode returning a string by accident still yields cannot-ask", () => {
  const cap = { mode: "json" as const, canAsk: false, canDraw: false, why: "test" };
  assert.deepEqual(interpret("approve", ["approve"], cap), { kind: "no-answer", reason: "cannot-ask" });
});

test("SC-003 (mutation): a mutant mapping N1 (dismissed) to answered is caught BY NAME", () => {
  const mutant = (raw: unknown, options: readonly string[], cap: any) => {
    if (raw === undefined && !cap.canAsk === false) return { kind: "answered", option: "approve" } as const; // wrongly "answers" a cancel
    return interpret(raw, options, cap);
  };
  const failed = checkInterpret(mutant);
  assert.ok(failed.includes("N1-tui-cancelled") || failed.includes("N1-rpc-cancelled"), failed.join(", "));
});

test("SC-003 (mutation): a mutant mapping headless (cannot-ask) to answered is caught BY NAME", () => {
  const mutant = (raw: unknown, options: readonly string[], cap: any) => (!cap.canAsk ? ({ kind: "answered", option: options[0] } as const) : interpret(raw, options, cap));
  const failed = checkInterpret(mutant);
  assert.ok(failed.some((n) => n.startsWith("N3") || n.startsWith("N4") || n.startsWith("N7") || n.startsWith("N9")), failed.join(", "));
});

test("SC-003 (mutation): a mutant accepting a non-string (e.g. confirm's boolean) as an answer is caught BY NAME", () => {
  const mutant = (raw: unknown, options: readonly string[], cap: any) => (cap.canAsk && raw !== undefined ? ({ kind: "answered", option: String(raw) } as const) : interpret(raw, options, cap));
  const failed = checkInterpret(mutant);
  assert.ok(failed.includes("N10-wrong-type-boolean"), failed.join(", "));
});

test("SC-003 (mutation): a mutant accepting an un-offered string is caught BY NAME", () => {
  const mutant = (raw: unknown, options: readonly string[], cap: any) => (cap.canAsk && typeof raw === "string" ? ({ kind: "answered", option: raw } as const) : interpret(raw, options, cap));
  const failed = checkInterpret(mutant);
  assert.ok(failed.includes("N8-not-offered"), failed.join(", "));
});

test("E4: there is no third Outcome value — every row's actual result is exactly 'answered' or 'no-answer'", () => {
  for (const row of SEAM_ROWS) {
    const got = interpret(row.raw, row.options, row.capability);
    assert.ok(got.kind === "answered" || got.kind === "no-answer", JSON.stringify(got));
  }
});
