// kiln/tests/ollama-ready/classification.test.ts — CR-6 / CR-9 (code review), r7 · OFFLINE tier.
// "Absent" (nothing answered) is a SKIP with a reason; "MISBEHAVING" (answered wrongly) is a FAILURE by its real name; a halted or
// stuck walk is named; and the driving walk must record its OWN selection.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkOllamaReady } from "../../validate/ollama-ready.ts";
import { OllamaError } from "../../src/ollama-resident.ts";
import { goodResident, failing } from "./_stand-in.ts";

const failingWith = (make: () => Error) => ({ ...goodResident(), preflight: async () => { throw make(); } });

test("CR-9: a server that answered but MISBEHAVED is a FAILURE named by its real code — never a skip, never 'endpoint-unreachable'", async () => {
  for (const code of ["bad-status", "bad-body", "redirect-refused"] as const) {
    const r = await checkOllamaReady({ resident: failingWith(() => new OllamaError(code, "x")) });
    assert.equal(r.skipped, false, `${code} is not "absent", so it must not be excused as a skip`);
    assert.equal(r.ready, false);
    assert.match(r.checks.find((c) => /^\(a\)/.test(c.name))!.detail, new RegExp(`MISBEHAVED \\(${code}\\)`), `${code} named in check (a)`);
    assert.doesNotMatch(JSON.stringify(r.checks), /endpoint unreachable/i, "and never mislabelled as unreachable");
  }
});

test("CR-9: an UNEXPECTED error from the resident is reported as `unknown`, not silently relabelled 'endpoint-unreachable'", async () => {
  const r = await checkOllamaReady({ resident: failingWith(() => new SyntaxError("Unexpected token '<'")) });
  assert.equal(r.skipped, false);
  assert.match(r.checks.find((c) => /^\(a\)/.test(c.name))!.detail, /MISBEHAVED \(unknown\)/);
});

test("CR-9: 'absent' is still a SKIP with a reason — endpoint-unreachable and timeout alike", async () => {
  for (const code of ["endpoint-unreachable", "timeout"] as const) {
    const r = await checkOllamaReady({ resident: failingWith(() => new OllamaError(code, "x")) });
    assert.equal(r.skipped, true, code);
    assert.equal(r.ready, false);
    assert.ok((r.skipReason ?? "").trim().length > 0);
  }
});

test("CR-3/CR-9: a walk that HALTS mid-run is named in check (c) — by unit and failure code — not lost as a generic error", async () => {
  const res = goodResident();
  res.run = async (u: { id: string }) => { if (u.id === "spec") throw new OllamaError("empty-visible", "no visible content"); res.trips++; return `out:${u.id}`; };
  const r = await checkOllamaReady({ resident: res });
  assert.equal(r.ready, false);
  assert.equal(r.skipped, false);
  const c = r.checks.find((x) => /^\(c\)/.test(x.name))!;
  assert.equal(c.ok, false);
  assert.match(c.detail, /EMPTY VISIBLE OUTPUT/);
  const r2 = await checkOllamaReady({ resident: { ...goodResident(), run: async (u: { id: string }) => { if (u.id === "plan") throw new OllamaError("timeout", "slow"); return "ok"; } } as never });
  assert.match(r2.checks.find((x) => /^\(c\)/.test(x.name))!.detail, /HALTED \(timeout\) at unit "plan" — a durable wait was recorded/);
});

test("CR-9: the probe has an OVERALL deadline — a stuck server cannot hold it for nine per-call timeouts", async () => {
  const t0 = Date.now();
  const r = await checkOllamaReady({ resident: { ...goodResident(), run: () => new Promise(() => undefined) } as never, deadlineMs: 150 });
  assert.ok(Date.now() - t0 < 5000, "returned promptly");
  assert.equal(r.ready, false);
  assert.match(r.checks.find((c) => /^\(c\)/.test(c.name))!.detail, /OVERALL deadline \(150 ms\)/);
});

test("CR-9: check (d) now ALSO verifies the DRIVING walk's own recorded selection — not just the mechanism on a stand-in", async () => {
  const r = await checkOllamaReady({ resident: goodResident() });
  const d = r.checks.filter((c) => c.name.includes("(d)"));
  assert.equal(d.length, 2, "the mechanism check AND the driving-walk check");
  assert.ok(d.some((c) => /DRIVING walk/.test(c.name) && c.ok));
  assert.equal(r.ready, true, `expected ready: ${failing(r).join("; ")}`);
});

test("CR-9: the dead `!claimed` escape is gone — a run that performed nothing FAILS (e) whatever it claims", async () => {
  const silent = { ...goodResident(), roundTrips: () => 0 };
  const r = await checkOllamaReady({ resident: silent as never });
  assert.match(failing(r).join("|"), /\(e\)/);
});
