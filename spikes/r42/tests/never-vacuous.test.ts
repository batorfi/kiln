// T022 — the evidence runner refuses to pass vacuously, and every refusal has a NAME (contracts/evidence-cli.md). Driven in-process through runEvidence
// with injected strategies, scenarios, install root and platform, plus the real CLI for usage and --kill-list.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkInstall } from "../src/install-check.ts";
import { runEvidence } from "../src/evidence.ts";
import { OwnerFailed } from "../src/harness.ts";
import type { Scenario } from "../src/scenario.ts";
import type { ScenarioResult } from "../src/evidence-model.ts";
import type { Strategy } from "../src/strategy.ts";

const CLI = fileURLToPath(new URL("../src/evidence.ts", import.meta.url));
const pass = (strategy: string, over: Partial<ScenarioResult> = {}): ScenarioResult => ({ scenario: "repeat:x", kind: "repeat", guarantee: "b", strategy, ran: true, passed: true, violated: [], ...over });
const stub = (name = "stub", killPoints = ["p1", "p2", "p3"]): Strategy => ({
  name, native: false, testOnly: true, caveats: [],
  killPoints: killPoints.map((n) => ({ name: n, where: n, phase: "move" as const })),
  async start() { throw new Error("not used"); },
  async inspect() { throw new Error("not used"); },
});
const repeatScenario: Scenario = { id: "repeat", kind: "repeat", guarantees: ["b"], run: async (s) => [pass(s.name)] };
const killScenario = (exercise: string[]): Scenario => ({
  id: "kill-point", kind: "kill-point", guarantees: ["a", "e"],
  run: async (s) => exercise.map((p) => pass(s.name, { scenario: `kill-point:${p}`, kind: "kill-point", guarantee: "a", killPoint: p })),
});
const run = (over: Parameters<typeof runEvidence>[0]) => runEvidence({ outDir: false, ...over });
const codes = (r: Awaited<ReturnType<typeof runEvidence>>) => r.failures.map((f) => f.code);

test("N1 no scenario registered ⇒ exit 1 `evidence-zero-tests` (no table is printed as if it meant something)", async () => {
  const r = await run({ strategies: [stub()], scenarios: [] });
  assert.equal(r.exitCode, 1);
  assert.ok(codes(r).includes("evidence-zero-tests"));
});

test("N2 a selected strategy that declares NO kill points ⇒ exit 1 `evidence-zero-kill-points`", async () => {
  const r = await run({ strategies: [stub("none", [])], scenarios: [repeatScenario] });
  assert.equal(r.exitCode, 1);
  assert.ok(codes(r).includes("evidence-zero-kill-points"));
});

test("N3 declared points but none exercised ⇒ exit 1 `evidence-zero-kill-points`", async () => {
  const r = await run({ strategies: [stub()], scenarios: [repeatScenario, killScenario([])] });
  assert.equal(r.exitCode, 1);
  assert.ok(codes(r).includes("evidence-zero-kill-points"));
});

test("N4 a SHORTFALL (2 of 3 exercised) is reported and the guarantee is not-proven — it does not pretend, and it does not fail the run", async () => {
  const r = await run({ strategies: [stub()], scenarios: [repeatScenario, killScenario(["p1", "p2"])] });
  assert.equal(r.exitCode, 0);
  const s = r.evidence!.strategies.stub;
  assert.equal(s.exercised, 2);
  assert.equal(s.guarantees.a.status, "not-proven");
  assert.ok(s.notes.some((n) => /p3/.test(n) && /not exercised/i.test(n)), s.notes.join("|"));
});

test("N5 everything exercised and passing ⇒ exit 0, and the evidence says held with the counts", async () => {
  const r = await run({ strategies: [stub()], scenarios: [repeatScenario, killScenario(["p1", "p2", "p3"])] });
  assert.equal(r.exitCode, 0, JSON.stringify(r.failures));
  const s = r.evidence!.strategies.stub;
  assert.equal(s.exercised, 3);
  assert.equal(s.guarantees.a.status, "held");
  assert.equal(s.guarantees.b.status, "held");
  assert.equal(s.guarantees.c.status, "not-proven", "a guarantee no scenario targeted is not-proven");
});

test("N6 an owner that cannot start ⇒ exit 1 `evidence-owner-failed`, with the child's stderr in the detail", async () => {
  const boom: Scenario = { id: "boom", kind: "repeat", guarantees: ["b"], run: async () => { throw new OwnerFailed("the owner died before it was ready\nSyntaxError: bad strategy"); } };
  const r = await run({ strategies: [stub()], scenarios: [boom, killScenario(["p1", "p2", "p3"])] });
  assert.equal(r.exitCode, 1);
  const f = r.failures.find((x) => x.code === "evidence-owner-failed");
  assert.ok(f && /SyntaxError/.test(f.detail));
});

test("N7 not on macOS ⇒ exit 1 `evidence-wrong-platform`, but the run is still printed and marked unsupported", async () => {
  const r = await run({ strategies: [stub()], scenarios: [repeatScenario, killScenario(["p1", "p2", "p3"])], platform: "linux" });
  assert.equal(r.exitCode, 1);
  assert.ok(codes(r).includes("evidence-wrong-platform"));
  assert.match(r.output, /unsupported/i);
  assert.match(r.output, /stub/, "the table is still printed");
});

test("N8 --only restricts the scenario kinds; a kind with no scenario ⇒ zero tests", async () => {
  const r = await run({ strategies: [stub()], scenarios: [repeatScenario], only: "race" });
  assert.equal(r.exitCode, 1);
  assert.ok(codes(r).includes("evidence-zero-tests"));
  const ok = await run({ strategies: [stub("none", [])], scenarios: [repeatScenario], only: "repeat" });
  assert.equal(ok.exitCode, 0, "with --only repeat, kill points are not required: " + JSON.stringify(ok.failures));
});

test("N9 install check: a good install returns the pin triple; each way of being wrong fails `evidence-install-mismatch`", () => {
  const root = mkdtempSync(join(tmpdir(), "r42-inst-"));
  const write = (pkgRange: string, lockVersion: string, installed: string | null) => {
    rmSync(root, { recursive: true, force: true });
    mkdirSync(root, { recursive: true });
    writeFileSync(join(root, "package.json"), JSON.stringify({ dependencies: { "@earendil-works/pi-durable": pkgRange } }));
    writeFileSync(join(root, "package-lock.json"), JSON.stringify({ packages: { "node_modules/@earendil-works/pi-durable": { version: lockVersion, integrity: "sha512-abc" } } }));
    if (installed !== null) {
      mkdirSync(join(root, "node_modules/@earendil-works/pi-durable"), { recursive: true });
      writeFileSync(join(root, "node_modules/@earendil-works/pi-durable/package.json"), JSON.stringify({ name: "@earendil-works/pi-durable", version: installed }));
    }
  };
  try {
    write("1.4.0", "1.4.0", "1.4.0");
    assert.deepEqual(checkInstall(root), { name: "@earendil-works/pi-durable", version: "1.4.0", integrity: "sha512-abc" });
    for (const [label, args] of [["a caret range", ["^1.4.0", "1.4.0", "1.4.0"]], ["a different lockfile version", ["1.4.0", "1.3.0", "1.4.0"]], ["a different installed version", ["1.4.0", "1.4.0", "1.3.0"]], ["no node_modules", ["1.4.0", "1.4.0", null]]] as const) {
      write(...args);
      assert.throws(() => checkInstall(root), (e: any) => e.code === "evidence-install-mismatch", label);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("N10 the runner reports an install mismatch as a named failure", async () => {
  const root = mkdtempSync(join(tmpdir(), "r42-inst-"));
  try {
    const r = await run({ strategies: [stub()], scenarios: [repeatScenario, killScenario(["p1", "p2", "p3"])], installRoot: root });
    assert.equal(r.exitCode, 1);
    assert.ok(codes(r).includes("evidence-install-mismatch"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("N11 the real CLI: --kill-list prints every declared point and exits 0; an unknown flag is a usage error (exit 2)", () => {
  const list = spawnSync(process.execPath, [CLI, "--kill-list"], { encoding: "utf8" });
  assert.equal(list.status, 0, list.stderr);
  assert.match(list.stdout, /control-sqlite\s+tx-after-write\s+move/);
  assert.match(list.stdout, /broken-two-commit\s+between-commits\s+move/);
  const bad = spawnSync(process.execPath, [CLI, "--no-such-flag"], { encoding: "utf8" });
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /unknown flag/);
});
