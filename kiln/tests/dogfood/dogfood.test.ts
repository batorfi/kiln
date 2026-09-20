// kiln/tests/dogfood/dogfood.test.ts — T015 (US3/US6): the DOGFOOD (D5, SC-003).
//
// The runtime is judged BY the contract 001 built: a stub walk's emitted JSONL is replayed through
// 001's UNMODIFIED `kiln/validate/log.ts`. A complete walk PASSES (R1–R6); a truncated prefix still
// PASSES (the "closed terminal" reconstructs, F-RECON); a forced out-of-order / gap stream FAILs with
// a NAMED reason. A broken no-silent-approval path makes the emitted log FAIL (SC-002 → SC-003).

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildStubWalk } from "../../src/walk.ts";
import { validateLog, checkOrdering } from "../../validate/log.ts";

function parse(lines: string[]): Record<string, unknown>[] {
  return lines.map((l) => l.trim()).filter((l) => l !== "").map((l) => JSON.parse(l) as Record<string, unknown>);
}

test("DOGFOOD complete: a full stub walk PASSES 001's kiln/validate/log.ts (R1–R6)", async () => {
  const walk = await buildStubWalk();
  const res = validateLog(parse(walk.lines));
  assert.ok(res.valid, `expected the complete walk to pass:\n${res.failures.join("\n")}`);
  assert.equal(walk.switches, 1, "the walk realized exactly one genuine tier boundary");
});

test("DOGFOOD prefix: a truncated stream still PASSES (the closed terminal reconstructs, F-RECON)", async () => {
  const walk = await buildStubWalk();
  for (let k = 1; k < walk.lines.length; k++) {
    const prefix = walk.lines.slice(0, k);
    const res = validateLog(parse(prefix));
      // A prefix is valid up to its last emitted seq — reconstructable, no shape lost to the close.
    assert.ok(res.valid, `prefix of ${k} lines must pass:\n${res.failures.join("\n")}`);
   }
});

test("DOGFOOD forced-violation: a seq gap is NAMED by 001's validator (R2)", async () => {
  const walk = await buildStubWalk();
  const records = parse(walk.lines.slice());
  // Forge an out-of-order seq on a later record (a gap / non-strictly-increasing ts sequence).
  records[3].seq = 99;
  const failures = checkOrdering(records);
  assert.ok(failures.length > 0, "a forced gap must surface an R2 failure");
  assert.ok(failures.join("\n").includes("R2"), "the failure must name the R2 ordering rule");
});

test("DOGFOOD negative (SC-002→SC-003): a broken no-silent-approval hole FAILs 001's validator", async () => {
  const lines = (await buildStubWalk()).lines.slice();
  // Re-open a silent-approval hole: strip the decider from a human-decided gate-completion.
  const broken = parse(lines).map((r) => {
    if (r.recordType === "gate-completion" && String((r as any)["gate-completion"]?.gate) === "3") {
        const gc = (r as any)["gate-completion"] = { ...r["gate-completion"] };
        delete gc.decidedBy; // a silent approval — 001's R3 must catch it
       }
    return r;
   });
  const res = validateLog(broken);
  assert.equal(res.valid, false, "a leaked silent approval must fail the validator");
  assert.ok(res.failures.join("\n").includes("no-silent-approval"), "the failure must name the R3 rule");
});
