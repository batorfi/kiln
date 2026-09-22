// kiln/tests/pi/readme-pi-version.test.ts — T044, r8 · FR-015 · OFFLINE tier.
// The README's claimed Pi version(s) must match MEASURED_PI_VERSIONS exactly — the Node-floor lesson (a declared range nobody ran was wrong).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { MEASURED_PI_VERSIONS } from "../../validate/_pi-driver.ts";

const repo = fileURLToPath(new URL("../../..", import.meta.url)).replace(/[\\/]$/, "");
const readme = readFileSync(join(repo, "README.md"), "utf8");

test("FR-015: every version in MEASURED_PI_VERSIONS is stated in the README", () => {
  for (const v of MEASURED_PI_VERSIONS) assert.ok(readme.includes(v), `README does not mention measured Pi version ${v}`);
});

test("FR-015: the README does not claim a Pi version range broader than what is measured (no bare 'Pi 0.x+' or caret/tilde range for Pi)", () => {
  const piSection = readme.slice(readme.indexOf("Optional, for the Pi tier"), readme.indexOf("Optional, for the Pi tier") + 400);
  assert.doesNotMatch(piSection, /Pi\s*[`"]?\^|Pi\s*[`"]?>=|Pi\s+\d+\.\d+\+/i, `README appears to declare an unmeasured Pi range: ${piSection}`);
});
