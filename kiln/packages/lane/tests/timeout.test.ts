// r16 T010 — withTierTimeout: work-finishes-first, timeout-fires-first, and caller-abort-fires-first are never confused.
import { test } from "node:test";
import assert from "node:assert/strict";
import { GenerationTimeoutError, withTierTimeout } from "#lane/timeout.ts";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

test("work finishing before the timeout resolves normally", async () => {
  const result = await withTierTimeout(500, new AbortController().signal, async () => {
    await sleep(5);
    return "done";
  });
  assert.equal(result, "done");
});

test("the timeout expiring first throws GenerationTimeoutError, even when work never settles or ignores its signal", async () => {
  await assert.rejects(
    withTierTimeout(20, new AbortController().signal, () => new Promise(() => {})), // never resolves, never checks its signal
    GenerationTimeoutError,
  );
});

test("the caller's own signal firing first rejects with the abort's reason, never GenerationTimeoutError", async () => {
  const controller = new AbortController();
  const reason = new Error("factory closing");
  const p = withTierTimeout(5000, controller.signal, () => new Promise(() => {}));
  setTimeout(() => controller.abort(reason), 10);
  await assert.rejects(p, (e: unknown) => {
    assert.equal(e, reason);
    assert.ok(!(e instanceof GenerationTimeoutError), "an abort must never be recast as a timeout");
    return true;
  });
});

test("an already-aborted signal rejects immediately without racing a timeout at all", async () => {
  const controller = new AbortController();
  const reason = new Error("already closed");
  controller.abort(reason);
  await assert.rejects(withTierTimeout(5000, controller.signal, () => new Promise(() => {})), (e: unknown) => e === reason);
});

test("work's own rejection (neither timeout nor abort) propagates unchanged", async () => {
  const boom = new Error("boom");
  await assert.rejects(
    withTierTimeout(500, new AbortController().signal, async () => { throw boom; }),
    (e: unknown) => e === boom,
  );
});

test("work receives a signal composed of both the caller's and the timeout's — it fires if either does", async () => {
  let sawAbort = false;
  await assert.rejects(
    withTierTimeout(15, new AbortController().signal, (signal) => {
      return new Promise((_, reject) => signal.addEventListener("abort", () => { sawAbort = true; reject(new Error("work's own abort")); }));
    }),
  );
  assert.equal(sawAbort, true, "work's own signal fired when the timeout did");
});
