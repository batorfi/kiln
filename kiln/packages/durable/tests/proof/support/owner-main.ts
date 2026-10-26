// The TEST-ONLY child owner. It opens a factory through the seam, runs a SCRIPT of steps given as JSON on argv, prints one `R <json>` line per step, and — when armed — dies by SIGKILL at a named
// kill point, which is what a crash looks like to the store (no handler, no flush, no close). It is the ONE place that reads arming from the environment: the product has no kill switch (research R7).
//   node owner-main.ts --store <dir> --script '<json array of steps>'
// env: STAY_ALIVE=1 (after the script, wait to be killed) · KILL_AT=<point> · KILL_LOG=<file> · FAULT_AT=<point> · HOLD_AT=<point> HOLD_MS=<n> (delay a step) · CLOCK_OFFSET_MS=<n> · LIBRARY_VERSION=<v> · READY_TIMEOUT_MS=<n> · LANE_MODULE=<file>
// steps: {op:"open",key,spec} {op:"submit",gate,key,move} {op:"submitMany",gate,moves:[{key,move}],concurrency?} {op:"state",gate} {op:"createTask",key,kind,input,owner}
//        {op:"inspect",gate?} {op:"tasks"} {op:"early",gate,key,move} (a move BEFORE ready, then the same after) {op:"hold"} (stay alive until killed) {op:"sleep",ms}
import { appendFileSync } from "node:fs";
import { openFactory, type Factory } from "#durable/factory.ts";
import type { Hooks } from "#durable/hooks.ts";

const args = process.argv.slice(2);
const arg = (f: string): string | undefined => (args.includes(f) ? args[args.indexOf(f) + 1] : undefined);
const store = arg("--store");
const script = JSON.parse(arg("--script") ?? "[]") as Record<string, any>[];
if (!store) {
  console.error("usage: node owner-main.ts --store <dir> --script <json>");
  process.exit(2);
}

const env = process.env;
const emit = (v: unknown): void => void console.log(`R ${JSON.stringify(v)}`);
const hooks: Hooks = {
  at(point) {
    if (env.KILL_AT === point) {
      if (env.KILL_LOG) appendFileSync(env.KILL_LOG, `${point}\n`);
      process.kill(process.pid, "SIGKILL");
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10_000); // SIGKILL cannot be caught; make sure nothing after the point runs meanwhile
    }
    if (env.HOLD_AT === point) return new Promise<void>((r) => setTimeout(r, Number(env.HOLD_MS ?? 0)));
  },
  fault(point) {
    if (env.FAULT_AT === point) throw new Error(`injected store failure: ${point}`);
  },
};
const offset = Number(env.CLOCK_OFFSET_MS ?? 0);
const extraKinds: any[] = [];
let lane: any;
if (env.LANE_MODULE) {
  const m = await import(env.LANE_MODULE);
  extraKinds.push(...(m.laneKinds?.() ?? []));
  lane = m.laneApi;
}

let factory: Factory;
try {
  factory = await openFactory({ store, hooks, now: () => Date.now() + offset, tasks: extraKinds, lane, installedLibraryVersion: env.LIBRARY_VERSION, readyTimeoutMs: env.READY_TIMEOUT_MS ? Number(env.READY_TIMEOUT_MS) : undefined });
} catch (e) {
  console.log(`ERR ${(e as Error).name} ${(e as Error).message}`);
  process.exit(1);
}
console.log("STARTED");

async function step(s: Record<string, any>): Promise<void> {
  switch (s.op) {
    case "open": return emit(await factory.gates.open(s.key, s.spec));
    case "submit": return emit(await factory.gates.submit(s.gate, s.key, s.move));
    case "state": return emit(await factory.gates.state(s.gate));
    case "createTask": return emit(await factory.tasks.create(s.key, s.kind, s.input, s.owner));
    case "inspect": return emit(await factory.inspect(s.gate));
    case "tasks": return emit(await factory.tasks.list());
    case "sleep": return void (await new Promise((r) => setTimeout(r, s.ms)));
    case "submitMany": {
      const moves = s.moves as { key: string; move: unknown }[];
      const results: unknown[] = new Array(moves.length);
      let next = 0;
      await Promise.all(Array.from({ length: s.concurrency ?? moves.length }, async () => {
        for (;;) {
          const i = next++;
          if (i >= moves.length) return;
          results[i] = await factory.gates.submit(s.gate, moves[i].key, moves[i].move as never);
        }
      }));
      return emit(results);
    }
    case "early": {
      const before = await factory.gates.submit(s.gate, s.key, s.move); // possibly before ready: not-ready is the honest answer
      await factory.ready;
      return emit({ before, after: await factory.gates.submit(s.gate, s.key, s.move) });
    }
    case "ready": return emit(await factory.ready.then(() => ({ ready: true }), (e: Error) => ({ ready: false, error: e.message })));
    case "hold": return void (await new Promise(() => {}));
    default: throw new Error(`unknown step ${String(s.op)}`);
  }
}
try {
  for (const s of script) {
    if (s.op !== "early" && s.op !== "ready") await factory.ready;
    await step(s);
  }
  await factory.ready.catch(() => {});
  console.log("DONE");
  emit({ reports: factory.reports.length });
  if (env.STAY_ALIVE) await new Promise(() => {}); // the harness kills it (SIGKILL) so the store is judged as a crash leaves it
  await factory.close();
} catch (e) {
  console.log(`ERR ${(e as Error).name} ${(e as Error).message}`);
  await factory.close().catch(() => {});
  process.exit(1);
}
