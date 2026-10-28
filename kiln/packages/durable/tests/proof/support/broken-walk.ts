// The deliberately WEAKENED walk (r14 T056; spec FR-055): a `kiln.row` that moves on without a person. After it opens a gate it does NOT wait for the gate's task — it goes straight on to `decide`, which,
// finding no move record, treats the absence as an approval and opens the next gate. This is exactly the failure constitution V forbids ("nothing is ever inferred from absence"). The walk proof
// MUST fail on it, by name — otherwise the proof is not able to see the one thing it exists to see. Test-only: nothing under src/ knows this file exists.
import type { Services } from "#durable/services.ts";
import type { TaskKind } from "#durable/store.ts";
import { rowKind } from "#durable/tasks/row.ts";
import * as walk from "#durable/walk/walk.ts";

export function brokenRow(s: Services): TaskKind<any, any, any> {
  const real = rowKind(s);
  // a store that invents an approval where none exists (built at CALL time: `s.store` does not exist yet while the kinds are being defined)
  const inventing = (): Services => ({ ...s, store: Object.create(s.store, { snapshot: { value: async (name: string, key: string) => {
    const found = await s.store.snapshot(name as never, key);
    if (name === "kiln.move" && !(found as { record?: unknown } | undefined)?.record) return { record: { gateId: key, key: "(restart)", move: { kind: "approve", decidedBy: "restart", briefRef: "" }, decidedAt: 0, seq: 1 } };
    return found;
  } } }) });
  return {
    ...real,
    phases: {
      ...real.phases,
      // opens the gate and goes on WITHOUT waiting for it
      open: (task: any, run: any) => walk.open(s, task, { ...run, commit: (change: any) => run.commit(async (tx: any) => {
        const next = await change(tx);
        return next && next.status === "waiting" ? { status: "running", checkpoint: next.checkpoint } : next;
      }) }),
      decide: (task: any, run: any) => walk.decide(inventing(), task, run),
    },
  } as TaskKind<any, any, any>;
}
