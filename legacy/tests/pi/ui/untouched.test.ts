// kiln/tests/pi/ui/untouched.test.ts — T034, r9 · the r7/r8 CR-10 pattern (see kiln/tests/pi/untouched.test.ts). Pins a HISTORICAL
// FACT about r9's own commit range — BASE..CLOSE — not a standing prohibition: no canonical r1/r2/r3/r7/r8 artifact changed while r9
// was implemented, EXCEPT the two declared exceptions (`kiln/ui/overlay.ts`'s column widths, `kiln/contracts/move-vocabulary.ts`'s
// additive `GATE_NAME`/`gateName()` — checked, more precisely, by `gate-name.test.ts`'s runtime assertions, not by this coarse
// git-diff check). BASE/CLOSE are filled in at r9's own close-out commit, the same deferred-pin approach r7/r8 used.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const BASE: string | null = null;
const CLOSE: string | null = null;

const repo = fileURLToPath(new URL("../../../..", import.meta.url)).replace(/[\\/]$/, "");
const git = (...a: string[]) => spawnSync("git", a, { cwd: repo, encoding: "utf8" });
const notYetPinned = BASE === null || CLOSE === null;
const haveRange = !notYetPinned && git("cat-file", "-e", `${BASE}^{commit}`).status === 0 && git("cat-file", "-e", `${CLOSE}^{commit}`).status === 0;
const skip = notYetPinned
  ? "BASE/CLOSE not yet set — fill them in at r9's close-out commit, the same way r7/r8's untouched.test.ts was pinned"
  : haveRange
    ? false
    : `no git history containing ${BASE}..${CLOSE} (an installed copy, a shallow clone, or a squash) — cannot compare`;

test("r9: no canonical r1/r2/r3/r7/r8 artifact changed within r9's own commit range (except the two declared exceptions)", { skip }, () => {
  const canonical = [
    "kiln/ui/hud.ts", "kiln/ui/popup.ts", "kiln/ui/gate0-face.ts", "kiln/ui/live-tui.ts", "kiln/src/gate.ts",
    "kiln/pi/outcome.ts", "kiln/pi/port.ts", "kiln/pi/status.ts", "kiln/pi/selftest.ts", "kiln/pi/index.ts",
    "kiln/validate/pi-ready.ts", "kiln/validate/_pi-driver.ts", "kiln/validate/_netscan.ts", "kiln/validate/log.ts",
    "kiln/validate/roadmap.ts", "kiln/schemas",
  ];
  const r = git("diff", "--stat", `${BASE}..${CLOSE}`, "--", ...canonical);
  assert.equal(r.stdout.trim(), "", `a canonical r1/r2/r3/r7/r8 artifact changed within r9's range ${BASE}..${CLOSE}:\n${r.stdout}`);
});

test("r9: kiln/ui/overlay.ts DID change (the declared exception is checked FOR, not just excluded)", { skip }, () => {
  const r = git("diff", "--stat", `${BASE}..${CLOSE}`, "--", "kiln/ui/overlay.ts");
  assert.notEqual(r.stdout.trim(), "", "kiln/ui/overlay.ts was expected to change (research D8's column-width computation) but did not");
});

test("r9: kiln/ui/keymap.ts DID change (the three re-declared keymap constants, research D10)", { skip }, () => {
  const r = git("diff", "--stat", `${BASE}..${CLOSE}`, "--", "kiln/ui/keymap.ts");
  assert.notEqual(r.stdout.trim(), "", "kiln/ui/keymap.ts was expected to change (the keymap re-decision) but did not");
});
