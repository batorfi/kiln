// kiln/tests/netscan/untouched.test.ts — T042 (US4), r7 · S13 · D5 · FR-015 · OFFLINE tier (skips if there is no git history).
// r7 changes ONE canonical signature (`Resident.run`, declared) and NOTHING else in 001's canonical artifacts:
// R5 needed no amendment because it scans record KEYS, not values, so the resident's symbolic location rides
// r3's existing `transition.reason` slot.
//
// CR-10: this asserts a HISTORICAL FACT about r7's own commit range — `BASE..CLOSE` — NOT a standing prohibition. It used to compare
// against `HEAD` and the working tree, which meant it would fail the moment the human closed r7 in the ROADMAP, and again when the two
// recorded validator fixes (`nextEligibleRow` counting `aborted`; `checkM1` following only `deps[0]`) landed in canonical files —
// forcing every future row to move the baseline. Pinning BOTH ends makes it stable: later rows may change these files; r7 did not.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const BASE = "c99e241"; // specs(006): r7 task breakdown — the parent of every r7 implementation change
const CLOSE = "471e1c6"; // docs(006): r7 implementation record — the last commit of the r7 lane (code-review fixes come after it)
const repo = fileURLToPath(new URL("../../..", import.meta.url));
const git = (...a: string[]) => spawnSync("git", a, { cwd: repo, encoding: "utf8" });
const haveRange = git("cat-file", "-e", `${BASE}^{commit}`).status === 0 && git("cat-file", "-e", `${CLOSE}^{commit}`).status === 0;
const skip = haveRange ? false : `no git history containing ${BASE}..${CLOSE} (an installed copy, a shallow clone, or a squash) — cannot compare`;

test("S13 / D5 / FR-015: NO canonical 001 artifact has changed since r7 began", { skip }, () => {
  const canonical = [
    "kiln/validate/log.ts", "kiln/validate/roadmap.ts", "kiln/validate/_core.ts", "kiln/validate/_report.ts",
    "kiln/schemas", "kiln/contracts/move-vocabulary.ts", "kiln/src/roles.ts",
  ];
  const r = git("diff", "--stat", `${BASE}..${CLOSE}`, "--", ...canonical);
  assert.equal(r.stdout.trim(), "", `a canonical 001 artifact changed within r7's range ${BASE}..${CLOSE}:\n${r.stdout}`);
});

test("S13 / P-IX: every Layer A/B/C surface is unchanged — the UI stayed wholly synchronous (research D2)", { skip }, () => {
  const r = git("diff", "--stat", `${BASE}..${CLOSE}`, "--", "kiln/ui");
  assert.equal(r.stdout.trim(), "", `kiln/ui changed within r7's range:\n${r.stdout}`);
});

test("S12 / P-VI: r7's code never touches the program — specs/ROADMAP.md is byte-identical to before implementation", { skip }, () => {
  const r = git("diff", "--stat", `${BASE}..${CLOSE}`, "--", "specs/ROADMAP.md");
  assert.equal(r.stdout.trim(), "", "the program is the HUMAN's record; r7's lane never edited it (the human's close, after CLOSE, is theirs to make)");
});
