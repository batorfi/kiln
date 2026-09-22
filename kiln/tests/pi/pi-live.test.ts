// kiln/tests/pi/pi-live.test.ts — T038, r8 · contracts/pi-ready.md R2.1, R6 · gated by kiln/tests/_pi-gate.ts (D8).
// Every test here is named `PI-LIVE: …` so `--pi` (FR-011) can require at least one to PASS. Runs against a REAL, installed Pi; hermetic
// (fresh temp config, --offline, no model). Skips with a printed reason when Pi is absent; FAILS instead when KILN_PI=1 demanded it (F-1).
import { test } from "node:test";
import assert from "node:assert/strict";
import { skipUnlessPi, demandFailure } from "../_pi-gate.ts";
import { checkPiReady } from "../../validate/pi-ready.ts";
import { openRpc } from "../../validate/_pi-driver.ts";
import { fileURLToPath } from "node:url";

const EXT_PATH = fileURLToPath(new URL("../../pi/index.ts", import.meta.url));

const gate = skipUnlessPi();

function assertNotDemandBlocked() {
  const failure = demandFailure();
  assert.equal(failure, null, failure ?? undefined);
}

test("PI-LIVE: PiReady is READY end-to-end — real Pi, both load routes, every non-answer refused", gate, async () => {
  assertNotDemandBlocked();
  const r = await checkPiReady();
  assert.equal(r.ready, true, JSON.stringify(r.failures, null, 2));
  assert.ok(r.piVersion, "a version was reported");
  assert.equal(r.skipped, false);
});

test("PI-LIVE: SC-002 — ONE documented command loads KILN into real Pi and returns the status summary in under 5s, no model call", gate, async () => {
  assertNotDemandBlocked();
  const t0 = Date.now();
  const session = openRpc(EXT_PATH);
  try {
    const since = session.promptNoWait("/kiln-status");
    const notify = await session.waitForUi("notify", 8000, since);
    const elapsed = Date.now() - t0;
    assert.ok(notify, "kiln-status must answer with a notify");
    assert.match((notify!.message as string) ?? "", /KILN status/);
    assert.ok(elapsed < 5000, `took ${elapsed}ms`);
  } finally { session.close(); }
});

test("PI-LIVE: --no-pi -> pi-missing", gate, async () => {
  assertNotDemandBlocked();
  const r = await checkPiReady({ bin: "/definitely/not/a/real/pi", env: { KILN_PI: "1" } });
  assert.ok(r.failures.some((f) => f.code === "pi-missing"));
});

test("PI-LIVE: --old-version -> pi-version-unmeasured", gate, async () => {
  assertNotDemandBlocked();
  const r = await checkPiReady({ hooks: { oldVersion: true } });
  assert.ok(r.failures.some((f) => f.code === "pi-version-unmeasured"));
});

test("PI-LIVE: --bad-entry -> extension-load-error (without hanging)", gate, async () => {
  assertNotDemandBlocked();
  const t0 = Date.now();
  const r = await checkPiReady({ hooks: { badEntry: true } });
  assert.ok(r.failures.some((f) => f.code === "extension-load-error"), JSON.stringify(r.failures));
  assert.ok(Date.now() - t0 < 20000, "must not hang");
});

test("PI-LIVE: --throw-on-load -> extension-load-error (without hanging)", gate, async () => {
  assertNotDemandBlocked();
  const t0 = Date.now();
  const r = await checkPiReady({ hooks: { throwOnLoad: true } });
  assert.ok(r.failures.some((f) => f.code === "extension-load-error"), JSON.stringify(r.failures));
  assert.ok(Date.now() - t0 < 20000, "must not hang");
});

test("PI-LIVE: --no-command -> command-missing", gate, async () => {
  assertNotDemandBlocked();
  const r = await checkPiReady({ hooks: { noCommand: true } });
  assert.ok(r.failures.some((f) => f.code === "command-missing"), JSON.stringify(r.failures));
});

test("PI-LIVE: --wrong-status -> round-trip-mismatch", gate, async () => {
  assertNotDemandBlocked();
  const r = await checkPiReady({ hooks: { wrongStatus: true } });
  assert.ok(r.failures.some((f) => f.code === "round-trip-mismatch"), JSON.stringify(r.failures));
});

test("PI-LIVE: --approve-non-answer -> non-answer-approved (the check that matters most)", gate, async () => {
  assertNotDemandBlocked();
  const r = await checkPiReady({ hooks: { approveNonAnswer: true } });
  assert.ok(r.failures.some((f) => f.code === "non-answer-approved"), JSON.stringify(r.failures));
});

test("PI-LIVE: --bad-manifest -> manifest-load-error, and the check OBSERVES a real failure, not a hardcoded one (T050 code-review fix)", gate, async () => {
  assertNotDemandBlocked();
  const r = await checkPiReady({ hooks: { badManifest: true } });
  assert.ok(r.failures.some((f) => f.code === "manifest-load-error"), JSON.stringify(r.failures));
  const g = r.checks.find((c) => c.name.startsWith("(g)"));
  assert.ok(g, "check g ran");
  // Measured: `pi install` on a manifest naming a missing file reports ok:true — Pi silently drops the broken extension rather than
  // erroring the install itself. A correct check g must show install.ok=true here (the honest signal is commandsPresent=false).
  assert.match(g!.detail, /install\.ok=true/, `expected the install itself to SUCCEED (Pi silently drops the broken extension): ${g!.detail}`);
  assert.match(g!.detail, /commandsPresent=false/, g!.detail);
});

test("PI-LIVE: R2.1 — every measured non-answer shape refuses, and the control answers (real Pi, not a fake)", gate, async () => {
  assertNotDemandBlocked();
  const r = await checkPiReady();
  const f = r.checks.find((c) => c.name.startsWith("(f)"));
  assert.ok(f, "check f ran");
  const parsed = JSON.parse(f!.detail) as { control: string; nonControl: string[] };
  assert.equal(parsed.control, "answered:approve");
  for (const shape of parsed.nonControl) assert.match(shape, /^no-answer:/, `shape ${shape} was not refused`);
});
