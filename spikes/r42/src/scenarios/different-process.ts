// T047 — the completer is a DIFFERENT PROCESS from the owner (FR-004, SC-004). Every guarantee row has a different-process result, so a row is `held` only if its
// different-process variant also ran and passed:
//   a, e  every kill-point scenario again, with `node src/client.ts` driving the owner (kill-point.ts, `separate`)
//   b, c  every exactly-once case again, the same way (exactly-once.ts, `separate`)
//   d     a gate opened by a separate process survives more consecutive kills than the library's default restart limit, answers a separate process's `state`, and
//         is then settled by a separate process's move — no clock, no timeout, no restart settled or parked it
// plus the R-6 negative case, `second-opener` (informational, not a guarantee input): a SECOND process opens the store file directly while the owner is running.
import { spawn } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { checkInvariants, checkStability, type Invariant } from "../invariants.ts";
import type { ScenarioResult } from "../evidence-model.ts";
import { inProcess, separateProcess } from "../completer.ts";
import { killNow, makeStore, startOwner } from "../harness.ts";
import type { Strategy } from "../strategy.ts";
import { GATE, KEY, MOVE, sleep } from "./common.ts";
import { RESTART_KILLS } from "./no-clock.ts";
import { runExactlyOnce } from "./exactly-once.ts";
import { runKillPointScenarios } from "./kill-point.ts";

async function runNoClockFromAnotherProcess(strategy: Strategy): Promise<ScenarioResult[]> {
  const s = makeStore();
  const base = { scenario: "different-process:no-clock", kind: "different-process" as const, guarantee: "d" as const, strategy: strategy.name };
  try {
    let owner = await startOwner({ strategy: strategy.name, store: s });
    const c = await separateProcess(s.socket);
    await c.open(GATE);
    const before = await strategy.inspect(s.store, GATE);
    const violated = new Set<Invariant>();
    for (let k = 0; k < RESTART_KILLS; k++) {
      await killNow(owner);
      owner = await startOwner({ strategy: strategy.name, store: s });
      await sleep(100);
      for (const v of checkInvariants(await strategy.inspect(s.store, GATE))) violated.add(v);
    }
    const state = await c.state(GATE);
    const after = await strategy.inspect(s.store, GATE);
    for (const v of checkStability(before, after)) violated.add(v);
    const move = await c.submit(GATE, KEY, MOVE);
    await killNow(owner);
    const ok = state.state === "waiting" && move.status === "committed";
    return [{ ...base, ran: true, passed: ok && violated.size === 0, violated: [...violated].sort() as Invariant[], detail: `opened by another process, ${RESTART_KILLS} consecutive kills, then state "${state.state}" and a move from another process: ${move.status}${move.status === "refused" ? ` (${move.reason})` : ""}`, counts: { kills: RESTART_KILLS } }];
  } finally {
    s.cleanup();
  }
}

export async function runDifferentProcessScenarios(strategy: Strategy): Promise<ScenarioResult[]> {
  return [...(await runKillPointScenarios(strategy, separateProcess, true)), ...(await runExactlyOnce(strategy, separateProcess, true)), ...(await runNoClockFromAnotherProcess(strategy))];
}

// ---- R-6: a second process opens the store file while the owner runs --------------------------------------------------------------------------------------
const PROBE = `
import { DatabaseSync } from "node:sqlite";
const out = { opened: false, read: null, writeLock: null };
try {
  const db = new DatabaseSync(process.argv[1]);
  db.exec("PRAGMA busy_timeout = 500");
  out.opened = true;
  try { out.read = db.prepare("SELECT count(*) AS n FROM sqlite_master").get().n; } catch (e) { out.read = "error: " + e.message; }
  try { db.exec("BEGIN IMMEDIATE"); out.writeLock = "obtained"; db.exec("ROLLBACK"); } catch (e) { out.writeLock = "refused: " + e.message; }
  db.close();
} catch (e) { out.error = e.message; }
console.log(JSON.stringify(out));
`;

export async function runSecondOpener(strategy: Strategy): Promise<ScenarioResult[]> {
  const s = makeStore();
  const base = { scenario: "second-opener:file", kind: "second-opener" as const, guarantee: "c" as const, strategy: strategy.name };
  try {
    const owner = await startOwner({ strategy: strategy.name, store: s });
    const c = await inProcess(s.socket);
    await c.open(GATE);
    const file = readdirSync(s.store).find((f) => f.endsWith(".sqlite"));
    if (!file) return [{ ...base, ran: false, passed: false, violated: [], detail: "the strategy keeps no .sqlite file in its store" }];
    const probe = await new Promise<string>((resolve) => {
      const p = spawn(process.execPath, ["--input-type=module", "-e", PROBE, join(s.store, file)], { stdio: ["ignore", "pipe", "ignore"] });
      let out = "";
      p.stdout.setEncoding("utf8");
      p.stdout.on("data", (d: string) => (out += d));
      p.on("close", () => resolve(out.trim()));
    });
    // whatever the second process saw, the gate must be exactly as it was, and the owner must still do its job
    const st = await c.state(GATE);
    const move = await c.submit(GATE, KEY, MOVE);
    c.close();
    await killNow(owner);
    const i = await strategy.inspect(s.store, GATE);
    const bad = checkInvariants(i);
    return [{ ...base, ran: true, passed: st.state === "waiting" && move.status === "committed" && bad.length === 0, violated: bad, detail: `a second process opened ${file} while the owner ran and saw ${probe}; the gate stayed "${st.state}" and a move still ${move.status}; ${i.records.length} record(s)` }];
  } finally {
    s.cleanup();
  }
}
