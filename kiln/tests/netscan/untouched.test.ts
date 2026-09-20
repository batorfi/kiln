// kiln/tests/netscan/untouched.test.ts — T042 (US4), r7 · S13 · D5 · FR-015 · OFFLINE tier (skips if there is no git history).
// r7 changes ONE canonical signature (`Resident.run`, declared) and NOTHING else in 001's canonical artifacts:
// R5 needed no amendment because it scans record KEYS, not values, so the resident's symbolic location rides
// r3's existing `transition.reason` slot. `BASE` is the last commit BEFORE r7's implementation began.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const BASE = "c99e241"; // specs(006): r7 task breakdown — the parent of every r7 implementation change
const repo = fileURLToPath(new URL("../../..", import.meta.url));
const git = (...a: string[]) => spawnSync("git", a, { cwd: repo, encoding: "utf8" });
const haveBase = git("cat-file", "-e", `${BASE}^{commit}`).status === 0;
const skip = haveBase ? false : `no git history containing ${BASE} (an installed copy, a shallow clone, or a squash) — cannot compare`;

test("S13 / D5 / FR-015: NO canonical 001 artifact has changed since r7 began", { skip }, () => {
  const canonical = [
    "kiln/validate/log.ts", "kiln/validate/roadmap.ts", "kiln/validate/_core.ts", "kiln/validate/_report.ts",
    "kiln/schemas", "kiln/contracts/move-vocabulary.ts", "kiln/src/roles.ts",
  ];
  const r = git("diff", "--stat", `${BASE}..HEAD`, "--", ...canonical);
  const dirty = git("diff", "--stat", "--", ...canonical); // uncommitted working-tree changes count too
  assert.equal(r.stdout.trim(), "", `a canonical 001 artifact changed since ${BASE}:\n${r.stdout}`);
  assert.equal(dirty.stdout.trim(), "", `a canonical 001 artifact has UNCOMMITTED changes:\n${dirty.stdout}`);
});

test("S13 / P-IX: every Layer A/B/C surface is unchanged — the UI stayed wholly synchronous (research D2)", { skip }, () => {
  const r = git("diff", "--stat", `${BASE}..HEAD`, "--", "kiln/ui");
  const dirty = git("diff", "--stat", "--", "kiln/ui");
  assert.equal(r.stdout.trim() + dirty.stdout.trim(), "", `kiln/ui changed:\n${r.stdout}${dirty.stdout}`);
});

test("S12 / P-VI: r7's code never touches the program — specs/ROADMAP.md is byte-identical to before implementation", { skip }, () => {
  const r = git("diff", "--stat", `${BASE}..HEAD`, "--", "specs/ROADMAP.md");
  const dirty = git("diff", "--stat", "--", "specs/ROADMAP.md");
  assert.equal(r.stdout.trim() + dirty.stdout.trim(), "", "the program is the HUMAN's record; no code path edits it");
});
