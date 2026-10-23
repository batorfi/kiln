// kiln/tests/pi/untouched.test.ts — T046, r8 · the r7 CR-10 pattern (see kiln/tests/netscan/untouched.test.ts) · OFFLINE tier.
// Pins a HISTORICAL FACT about r8's own commit range — BASE..CLOSE — not a standing prohibition: no canonical artifact from r1 (the lane, gate,
// scheduler, resident) or r7 (the async spine, Ollama resident, OllamaReady) changed while r8 was implemented. Pinning BOTH ends makes the test
// stable across later rows, the way r7's own version is.
//
// Pinned at the close-out commit (T052): BASE = 28897f8 (specs+tasks for r8, the plan-and-tasks commit — the parent of r8's first
// implementation commit); CLOSE = bea0683 (docs(007-kiln-pi-extension): r8 reports, spike scripts, README and overview — the last commit
// of the r8 lane). The same pattern as kiln/tests/netscan/untouched.test.ts pins r7's BASE/CLOSE.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const BASE: string | null = "28897f8";
const CLOSE: string | null = "bea0683";

const repo = fileURLToPath(new URL("../../..", import.meta.url)).replace(/[\\/]$/, "");
const git = (...a: string[]) => spawnSync("git", a, { cwd: repo, encoding: "utf8" });
const notYetPinned = BASE === null || CLOSE === null;
const haveRange = !notYetPinned && git("cat-file", "-e", `${BASE}^{commit}`).status === 0 && git("cat-file", "-e", `${CLOSE}^{commit}`).status === 0;
const skip = notYetPinned
  ? "BASE/CLOSE not yet set — fill them in at r8's close-out commit (T052), the same way r7's untouched.test.ts was pinned"
  : haveRange
    ? false
    : `no git history containing ${BASE}..${CLOSE} (an installed copy, a shallow clone, or a squash) — cannot compare`;

test("r8: no canonical r1/r7 artifact changed within r8's own commit range", { skip }, () => {
  const canonical = [
    "kiln/validate/log.ts", "kiln/validate/roadmap.ts", "kiln/validate/_core.ts", "kiln/validate/_report.ts",
    "kiln/schemas", "kiln/contracts/move-vocabulary.ts", "kiln/src/roles.ts", "kiln/src/gate.ts", "kiln/src/lane.ts",
    "kiln/src/scheduler.ts", "kiln/src/ollama-resident.ts", "kiln/ui",
  ];
  const r = git("diff", "--stat", `${BASE}..${CLOSE}`, "--", ...canonical);
  assert.equal(r.stdout.trim(), "", `a canonical r1/r7 artifact changed within r8's range ${BASE}..${CLOSE}:\n${r.stdout}`);
});
