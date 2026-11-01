// `packages/lane/src/timeout.ts` — the per-tier generation timeout (r16 T010, research R6, Clarification 1).
//
// A step's generation is raced against its tier's own timeout, composed with the caller's own abort signal (a factory
// close still wins). On expiry this throws `GenerationTimeoutError`, distinct from an ordinary abort, so `unit.ts`'s
// existing `if (run.signal.aborted) return;` branches (which commit nothing) never accidentally swallow a timeout as a
// factory close — the two must stay distinguishable (FR-006). The timeout ends a STEP, never a gate (FR-008,
// constitution V): nothing here settles anything; it only decides how long one `work` invocation waits before it fails.
//
// The race is explicit (not "pass a signal and hope `work` returns promptly when it fires"): `work` receives the
// composed signal so its own request can abort too, but THIS function's return timing never depends on `work`
// cooperating with that signal — a `work` that ignores its signal entirely still gets timed out correctly.
export class GenerationTimeoutError extends Error {
  override name = "GenerationTimeoutError";
  constructor(ms: number) {
    super(`generation exceeded its tier's timeout (${ms} ms)`);
  }
}

/**
 * Races `work` against a timeout of `ms`, composed with `signal` (an abort from `signal` wins over the timeout — a
 * factory close is never reported as a generation timing out). Resolves/rejects with whatever `work` does when it
 * finishes first; throws `GenerationTimeoutError` when the timeout fires first, regardless of whether `work` itself
 * ever settles; propagates an ordinary abort (`signal.aborted`) as the abort it is, never recast as a timeout.
 */
export function withTierTimeout<T>(ms: number, signal: AbortSignal, work: (signal: AbortSignal) => Promise<T>): Promise<T> {
  if (signal.aborted) return Promise.reject(signal.reason ?? new Error("aborted"));
  const timeoutSignal = AbortSignal.timeout(ms);
  const composed = AbortSignal.any([signal, timeoutSignal]);

  return new Promise<T>((resolveRace, rejectRace) => {
    let settled = false;
    const onAbort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      if (signal.aborted) rejectRace(signal.reason ?? new Error("aborted"));
      else rejectRace(new GenerationTimeoutError(ms));
    };
    const cleanup = () => {
      signal.removeEventListener("abort", onAbort);
      timeoutSignal.removeEventListener("abort", onAbort);
    };
    signal.addEventListener("abort", onAbort, { once: true });
    timeoutSignal.addEventListener("abort", onAbort, { once: true });

    work(composed).then(
      (value) => {
        if (settled) return; // the race already settled (timeout or abort) — work's late result is discarded
        settled = true;
        cleanup();
        resolveRace(value);
      },
      (err) => {
        if (settled) return;
        settled = true;
        cleanup();
        rejectRace(err);
      },
    );
  });
}
