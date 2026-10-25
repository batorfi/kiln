// R6 (r12 T044): the runner's measured-Pi list equals the legacy probe's. New code may not import legacy, so the legacy file is read as TEXT.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MEASURED_PI_VERSIONS } from "../measured-pi.ts";

test("R6 MEASURED_PI_VERSIONS equals the list in legacy/validate/_pi-driver.ts", () => {
  const text = readFileSync(new URL("../../../legacy/validate/_pi-driver.ts", import.meta.url), "utf8");
  const m = /export const MEASURED_PI_VERSIONS[^=]*=\s*\[([^\]]*)\]/.exec(text);
  assert.ok(m, "the legacy constant was not found — never pass vacuously when the thing to compare is missing");
  const legacy = [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
  assert.ok(legacy.length > 0, "the legacy list is empty");
  assert.deepEqual([...MEASURED_PI_VERSIONS], legacy);
});
