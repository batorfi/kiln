// T036 — no clock, no timeout, no restart settles a gate (guarantee d), and a gate resumes as it was (guarantee e).
//   no-clock:jump-live            the clock the strategy is handed jumps TEN YEARS while the gate waits
//   no-clock:jump-across-restart  the owner is killed and restarted with the clock ten years ahead (a machine that slept)
//   no-clock:wall-time            two seconds of REAL time pass
//   restart-limit:consecutive-kills   MORE consecutive kills than the library's default restart limit (5), with no move in between: the gate is neither
//                                     settled nor parked (the library parks a task cut off 5 times in a row — a gate must not be)
//   restart-limit:settled-survives    the same number of kills on a SETTLED gate: it stays settled, with the same record
// The controls use no clock, so they pass trivially; the scenarios earn their keep on the native strategies, and are shown able to FAIL in the tests.
import { checkInvariants, checkStability, type Invariant } from "../invariants.ts";
import type { ScenarioResult } from "../evidence-model.ts";
import { connect } from "../client.ts";
import { killNow, makeStore, startOwner, type Store } from "../harness.ts";
import type { Strategy } from "../strategy.ts";
import { GATE, KEY, MOVE, TEN_YEARS_MS, sleep } from "./common.ts";

export const RESTART_KILLS = 7; // > the library's default restartLimit of 5

async function waitingAndClean(strategy: Strategy, s: Store, via: "owner" | "store", clientState?: string): Promise<{ violated: Invariant[]; detail: string }> {
  const i = await strategy.inspect(s.store, GATE);
  const violated = checkInvariants(i);
  const stateOk = clientState === undefined || clientState === "waiting";
  return { violated, detail: `gate ${i.gate} (${via})${clientState !== undefined ? `, the owner reports "${clientState}"` : ""}${stateOk ? "" : " — NOT waiting"}` };
}

const result = (strategy: Strategy, scenario: string, kind: "no-clock" | "restart-limit", guarantee: "d" | "e", violated: Invariant[], detail: string, counts?: Record<string, number>, ok = true): ScenarioResult => ({
  scenario, kind, guarantee, strategy: strategy.name, ran: true, passed: ok && violated.length === 0, violated, detail, counts,
});

export async function runClockScenarios(strategy: Strategy): Promise<ScenarioResult[]> {
  const out: ScenarioResult[] = [];

  { // jump-live
    const s = makeStore();
    try {
      const owner = await startOwner({ strategy: strategy.name, store: s });
      const c = await connect(s.socket);
      await c.open(GATE);
      await c.setClock(TEN_YEARS_MS);
      await sleep(400);
      const st = await c.state(GATE);
      c.close();
      const r = await waitingAndClean(strategy, s, "store", st.state);
      await killNow(owner);
      out.push(result(strategy, "no-clock:jump-live", "no-clock", "d", r.violated, `clock +10 years while waiting: ${r.detail}`, undefined, st.state === "waiting"));
    } finally {
      s.cleanup();
    }
  }
  { // jump-across-restart
    const s = makeStore();
    try {
      const first = await startOwner({ strategy: strategy.name, store: s });
      const c = await connect(s.socket);
      await c.open(GATE);
      c.close();
      await killNow(first);
      const second = await startOwner({ strategy: strategy.name, store: s, env: { OWNER_CLOCK_OFFSET_MS: String(TEN_YEARS_MS) } });
      await sleep(400);
      const c2 = await connect(s.socket);
      const st = await c2.state(GATE);
      c2.close();
      const r = await waitingAndClean(strategy, s, "store", st.state);
      await killNow(second);
      out.push(result(strategy, "no-clock:jump-across-restart", "no-clock", "d", r.violated, `killed, restarted with the clock +10 years: ${r.detail}`, undefined, st.state === "waiting"));
    } finally {
      s.cleanup();
    }
  }
  { // wall-time
    const s = makeStore();
    try {
      const owner = await startOwner({ strategy: strategy.name, store: s });
      const c = await connect(s.socket);
      await c.open(GATE);
      await sleep(2000);
      const st = await c.state(GATE);
      c.close();
      const r = await waitingAndClean(strategy, s, "store", st.state);
      await killNow(owner);
      out.push(result(strategy, "no-clock:wall-time", "no-clock", "d", r.violated, `2 s of real time: ${r.detail}`, undefined, st.state === "waiting"));
    } finally {
      s.cleanup();
    }
  }
  return out;
}

export async function runRestartLimitScenarios(strategy: Strategy): Promise<ScenarioResult[]> {
  const out: ScenarioResult[] = [];

  { // consecutive kills on a WAITING gate
    const s = makeStore();
    try {
      let owner = await startOwner({ strategy: strategy.name, store: s });
      const c = await connect(s.socket);
      await c.open(GATE);
      c.close();
      const before = await strategy.inspect(s.store, GATE);
      const violated = new Set<Invariant>();
      for (let k = 0; k < RESTART_KILLS; k++) {
        await killNow(owner);
        owner = await startOwner({ strategy: strategy.name, store: s });
        await sleep(150); // let a recovering strategy run (and, in a library that counts restarts, count)
        for (const v of checkInvariants(await strategy.inspect(s.store, GATE))) violated.add(v);
      }
      const c2 = await connect(s.socket);
      const st = await c2.state(GATE);
      c2.close();
      const after = await strategy.inspect(s.store, GATE);
      await killNow(owner);
      const stability = checkStability(before, after);
      const counts = { kills: RESTART_KILLS };
      out.push(result(strategy, "restart-limit:consecutive-kills", "restart-limit", "d", [...violated].sort() as Invariant[], `${RESTART_KILLS} consecutive kills with no move: gate ${after.gate}, blocked ${after.blocked}, the owner reports "${st.state}"`, counts, st.state === "waiting"));
      out.push(result(strategy, "restart-limit:resumes-waiting", "restart-limit", "e", stability, `after ${RESTART_KILLS} kills the gate is as it was (${before.gate} → ${after.gate})`, counts, st.state === "waiting"));
    } finally {
      s.cleanup();
    }
  }
  { // consecutive kills on a SETTLED gate
    const s = makeStore();
    try {
      let owner = await startOwner({ strategy: strategy.name, store: s });
      const c = await connect(s.socket);
      await c.open(GATE);
      const committed = await c.submit(GATE, KEY, MOVE);
      c.close();
      const before = await strategy.inspect(s.store, GATE);
      for (let k = 0; k < RESTART_KILLS; k++) {
        await killNow(owner);
        owner = await startOwner({ strategy: strategy.name, store: s });
        await sleep(100);
      }
      const after = await strategy.inspect(s.store, GATE);
      await killNow(owner);
      const stability = checkStability(before, after);
      out.push(result(strategy, "restart-limit:settled-survives", "restart-limit", "e", stability, `a settled gate after ${RESTART_KILLS} kills: ${before.gate} → ${after.gate}; the move was ${committed.status}`, { kills: RESTART_KILLS }, committed.status === "committed"));
    } finally {
      s.cleanup();
    }
  }
  return out;
}

/** Both families, for the tests and for callers that want them together. */
export async function runNoClockScenarios(strategy: Strategy): Promise<ScenarioResult[]> {
  return [...(await runClockScenarios(strategy)), ...(await runRestartLimitScenarios(strategy))];
}
