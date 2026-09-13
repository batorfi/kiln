// kiln/tests/runtime-ready/runtime-ready.test.ts — T027 (US6): RuntimeReady is falsifiable (SC-006).
import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkRuntimeReady, reportRuntimeReady, type RuntimeReadyResult } from "../../validate/runtime-ready.ts";

test("US6 SC-006: the full runtime is RuntimeReady (wired + a valid, cloud-free emitted log)", () => {
  const r = checkRuntimeReady();
  const names = r.checks.map((c) => c.name);
  assert.ok(names.some((n) => /module lane/.test(n)), "asserts each runtime module is wired");
  assert.ok(names.some((n) => /emitted log passes/.test(n)), "asserts the emitted log passes 001's log.ts");
  assert.ok(names.some((n) => /zero-network/.test(n)), "asserts the module graph pulls no cloud (P-VIII)");
  assert.equal(r.ready, true, "expected RuntimeReady:\n" + JSON.stringify(r.checks, null, 2));
});

test("US6: reportRuntimeReady prints a human-readable READY block", () => {
  const out = reportRuntimeReady();
  assert.ok(out.startsWith("PASS"), "the report opens with PASS");
  assert.ok(out.includes("RuntimeReady"), "the report names the check");
});

test("US6 falsifiable (a): a missing/broken module FAILs and NAMES it", () => {
  const r = checkRuntimeReady({ writer: "/no/such/log-writer.ts" });
  assert.equal(r.ready, false, "removing the writer must not be ready");
  assert.ok(
     r.checks.some((c) => /module log-writer/.test(c.name) && !c.ok && /missing|broken/.test(c.detail)),
     "the gap must be named",
   );
});

test("US6 falsifiable (a): the not-wired index FAILs", () => {
  const tmp = join(tmpdir(), "kiln-not-wired-index.ts");
  writeFileSync(tmp, 'export function laneIsWired() { return false; }\nconst WIRING_STATUS = "not-wired";\n');
  const r = checkRuntimeReady({ index: tmp });
  assert.equal(r.ready, false, "the not-wired stub must FAIL RuntimeReady (a)");
  assert.ok(r.checks.some((c) => /index wired/.test(c.name) && !c.ok), "the gap must name the index wiring");
});

test("US6 falsifiable (b): a broken no-silent-approval hole FAILs the dogfood and names it", () => {
  const r: RuntimeReadyResult = checkRuntimeReady({ brokenDogfood: true });
  assert.equal(r.ready, false, "opening the silent-approval hole must FAIL the probe");
  assert.ok(
     r.checks.some((c) => /emitted log passes/.test(c.name) && !c.ok),
     "the broken dogfood must be named",
   );
});
