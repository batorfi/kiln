// kiln/src/clock.ts — T004 (Foundational)
//
// A DETERMINISTIC monotonic clock. r1's writer (R2: `ts` non-decreasing) and its `cost` records
// (`wallClock` matching /^([0-9]{2}:){1,2}[0-9]{2}$/) need reproducible, non-decreasing time so the
// dogfood (SC-003) is deterministic — including the "closed terminal / truncated prefix" case, which
// reconstructs to its last emitted `seq` regardless of wall time. The default is a fixed ISO-8601
// base advanced by a tick counter; tests may inject a fixed ts.
//
// No I/O, no network (P-VIII). P-IX: `wallClock()` is a pure READ of the current instant, never a
// timer/refresh loop (no setInterval/setTimeout).

/** A monotonic clock: `now()` yields an ISO-8601 string; `wallClock()` an "HH:MM" field. */
export interface Clock {
  now(): string;
  wallClock(): string;
}

export interface ClockOptions {
  /** Base ISO-8601 instant (default fixed base). */
  base?: string;
  /** Milliseconds advanced per `now()` tick (default 60_000 — one minute per record). */
  tickMs?: number;
  /** An override instant source; when set, `now()`/`wallClock()` return this same value every call. */
  fixed?: string;
}

const DEFAULT_BASE_MS = Date.parse("2026-09-13T00:00:00Z");

/**
 * Build a deterministic monotonic clock.
 *   - No `fixed`: `now()` returns `+tickMs` each call (advancing), always non-decreasing; `wallClock()`
 *     derives an "HH:MM" from the current instant WITHOUT advancing it (P-IX read, not a timer).
 *   - With a `fixed`: `now()`/`wallClock()` return that same value every call (a single frozen ts —
 *     used by per-record writer tests that only need `ts` present and non-decreasing).
 */
export function makeClock(opts: ClockOptions = {}): Clock {
  const base = opts.base ? Date.parse(opts.base) : DEFAULT_BASE_MS;
  const tickMs = opts.tickMs ?? 60_000;
  const fixed = opts.fixed;
  let current = base;
  const hhmm = (ms: number): string => {
    const totalMin = Math.floor(ms / 60_000);
    const h = String(Math.floor((totalMin % 1440) / 60)).padStart(2, "0");
    const mm = String(((totalMin % 60) + 60) % 60).padStart(2, "0");
    return `${h}:${mm}`;
  };
  return {
    now(): string {
      if (fixed) return fixed;
      current += tickMs; // advance, then report — always non-decreasing (R2)
      return new Date(current).toISOString();
    },
    wallClock(): string {
       if (fixed) {
        const m = /(\d{2}):(\d{2})/.exec(fixed);
        return m ? `${m[1]}:${m[2]}` : "00:00";
       }
      return hhmm(current); // a read; does not advance
      },
    };
}
