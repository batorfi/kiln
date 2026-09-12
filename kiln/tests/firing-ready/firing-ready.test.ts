// kiln/tests/firing-ready/firing-ready.test.ts — T022 (US4)
// FiringReady is falsifiable: a full contract set is ready; remove/omit one
// element and it FAILS, naming the gap. Runs no lane (SC-006).
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkFiringReady, reportFiringReady } from "../../validate/firing-ready.ts";

test("all three contracts present + consistent ⇒ FiringReady passes", () => {
  const r = checkFiringReady();
  assert.ok(r.ready, "expected ready: " + JSON.stringify(r.checks));
});
test("FiringReady reports every check name", () => {
  const names = checkFiringReady().checks.map((c) => c.name);
  assert.ok(names.some((n) => /factory-log schema/.test(n)));
  assert.ok(names.some((n) => /roadmap schema/.test(n)));
  assert.ok(names.some((n) => /gate-rail/.test(n)));
  assert.ok(names.some((n) => /ROADMAP\.md/.test(n)));
});
test("omitting the factory-log schema ⇒ FiringReady fails and NAMES it", () => {
  const r = checkFiringReady({ factoryLogSchema: "/no/such/factory-log.schema.json" });
  assert.equal(r.ready, false);
  assert.ok(r.checks.some((c) => !c.ok && /factory-log schema/.test(c.name) && /missing file/.test(c.detail)), "must name the gap");
});
test("a malformed (non-JSON) schema ⇒ FiringReady fails on that contract", () => {
  const r = checkFiringReady({ roadmapSchema: new URL("../../ROADMAP.md", import.meta.url).pathname });
  assert.equal(r.ready, false, "roadmap.md is not a valid JSON schema");
  assert.ok(r.checks.some((c) => !c.ok && /roadmap schema/.test(c.name)));
});
test("the CLI report is non-empty and human-readable", () => {
  assert.ok(reportFiringReady().length > 0);
});
