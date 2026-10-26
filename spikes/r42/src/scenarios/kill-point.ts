// T034 — kill at EVERY declared kill point (guarantees a and e). For each point: start an owner armed with KILL_AT=<point>, drive a move at it, confirm the owner
// died by SIGKILL AT THAT POINT, read the store the crash left behind (a fresh reader — no owner), restart a clean owner, read it again, and let the oracle judge:
//   guarantee a — the invariants hold in BOTH readings (no half-applied move, whatever the point)
//   guarantee e — the restart changed nothing: the state the owner reports and the second reading equal the first (invariant I5/I6 across the restart)
// A point that never fires is `ran: false` — never a pass.
import type { Invariant } from "../invariants.ts";
import { checkInvariants, checkStability } from "../invariants.ts";
import type { ScenarioResult } from "../evidence-model.ts";
import { connect } from "../client.ts";
import { killNow, makeStore, startOwner } from "../harness.ts";
import type { KillPoint, Strategy } from "../strategy.ts";
import { GATE, KEY, MOVE, settle, unique } from "./common.ts";

export async function runKillPointScenarios(strategy: Strategy): Promise<ScenarioResult[]> {
  const out: ScenarioResult[] = [];
  for (const kp of strategy.killPoints) out.push(...(await runOne(strategy, kp)));
  return out;
}

async function runOne(strategy: Strategy, kp: KillPoint): Promise<ScenarioResult[]> {
  const s = makeStore();
  const base = { kind: "kill-point" as const, strategy: strategy.name, killPoint: kp.name, scenario: `kill-point:${kp.name}` };
  const notRun = (detail: string): ScenarioResult[] => (["a", "e"] as const).map((guarantee) => ({ ...base, guarantee, ran: false, passed: false, violated: [], detail }));
  try {
    // 1 — drive the point
    let died: { code: number | null; signal: NodeJS.Signals | null } | undefined;
    if (kp.phase === "recovery") {
      // a previous life leaves a store behind; the NEXT start dies during its recovery
      const first = await startOwner({ strategy: strategy.name, store: s });
      const c = await connect(s.socket);
      await c.open(GATE);
      c.close();
      await killNow(first);
      const second = await startOwner({ strategy: strategy.name, store: s, killAt: kp.name, expectDeath: true });
      died = await settle(second.exited, 8000);
    } else {
      const owner = await startOwner({ strategy: strategy.name, store: s, killAt: kp.name, expectDeath: true });
      try {
        const c = await connect(s.socket, { timeoutMs: 3000 });
        await c.open(GATE);
        await c.submit(GATE, KEY, MOVE);
        c.close();
      } catch {
        /* the owner died while we were talking to it — that is what we armed */
      }
      died = await settle(owner.exited, 3000);
    }
    if (!died || died.signal !== "SIGKILL" || !s.killed().includes(kp.name)) {
      return notRun(`kill point never fired (owner ${died ? `ended with signal ${died.signal}, code ${died.code}` : "was still alive after 3 s"}; kill log: [${s.killed().join(", ")}])`);
    }

    // 2 — the store the crash left behind, read by a fresh reader
    const i1 = await strategy.inspect(s.store, GATE);

    // 3 — a clean restart, and what the owner itself reports
    const owner2 = await startOwner({ strategy: strategy.name, store: s });
    const c2 = await connect(s.socket);
    const reported = await c2.state(GATE).catch(() => ({ state: "error" as const }));
    c2.close();
    const i2 = await strategy.inspect(s.store, GATE);
    await killNow(owner2);

    // 4 — the oracle
    const atomic: Invariant[] = unique([...checkInvariants(i1), ...checkInvariants(i2)]).sort() as Invariant[];
    const stable: Invariant[] = checkStability(i1, i2);
    const mismatch = reported.state === "error" || (reported.state === "settled") !== (i2.gate === "settled");
    if (mismatch && !stable.includes("I5")) stable.push("I5");
    const detail = `owner died by SIGKILL at ${kp.name}; after the crash: gate ${i1.gate}, ${i1.records.length} record(s); after the restart: gate ${i2.gate}, the owner reports "${reported.state}"`;
    return [
      { ...base, guarantee: "a", ran: true, passed: atomic.length === 0, violated: atomic, detail },
      { ...base, guarantee: "e", ran: true, passed: stable.length === 0, violated: stable, detail },
    ];
  } finally {
    s.cleanup();
  }
}
