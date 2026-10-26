// T046 — a move is keyed exactly once, the first move wins, and every refusal changes nothing (guarantees b and c). Each case has its own owner and store; a case
// reads the store AFTER the owner has been killed (a fresh reader, no owner) so a count of records is the store's, not the owner's memory.
//   b  repeat:concurrent    REPEATS concurrent submissions of one (key, move): exactly one `committed`, the rest `repeat` naming that record, one record
//   b  repeat:after-restart the same after a SIGKILL and a restart of a settled gate: no `committed`, every one a `repeat`, still one record
//   b  conflict:key         the same key with a DIFFERENT move: `refused(key-conflict)` naming the original; nothing changed
//   c  race:distinct-keys   RACERS different (key, move) pairs concurrently: exactly one `committed`, the rest `refused(lost-race|stale)` each naming the winner
//   c  conflict:stale       a move to a settled gate: `refused(stale)` naming the key of the move that settled it (FR-006); nothing changed
//   c  conflict:invalid-move / conflict:unknown-gate   refused; nothing written
//   c  conflict:not-ready   a move while the owner starts: `refused(not-ready)`; the same key succeeds once ready
//   c  store-error:store-write   an injected store failure: `refused(store-error)`, gate still waiting, no record, invariants hold after a restart; then the same key commits
// Run twice by the evidence: with an in-process completer (kind repeat/race/conflict/store-error) and with `node src/client.ts` (kind different-process).
import type { Invariant } from "../invariants.ts";
import { checkInvariants } from "../invariants.ts";
import type { Guarantee, ScenarioKind, ScenarioResult } from "../evidence-model.ts";
import { inProcess, type Completer, type CompleterFactory } from "../completer.ts";
import { killNow, makeStore, startOwner, type Owner, type Store } from "../harness.ts";
import { sameMove, type Move, type Outcome } from "../port.ts";
import type { Strategy } from "../strategy.ts";
import { GATE, KEY, MOVE } from "./common.ts";

/** Concurrent identical submissions (≥ 100, data-model §4). */
export const REPEATS = 100;
/** Concurrent competing submissions (≥ 100). */
export const RACERS = 100;
const CONNECTIONS = 10;

const tally = (rs: Outcome[]): { committed: Outcome[]; repeat: Outcome[]; refused: Outcome[] } => ({
  committed: rs.filter((r) => r.status === "committed"),
  repeat: rs.filter((r) => r.status === "repeat"),
  refused: rs.filter((r) => r.status === "refused"),
});

class Case {
  readonly s: Store = makeStore();
  owner!: Owner;
  pool: Completer[] = [];
  readonly strategy: Strategy;
  readonly factory: CompleterFactory;
  constructor(strategy: Strategy, factory: CompleterFactory) {
    this.strategy = strategy;
    this.factory = factory;
  }
  async start(opts: { faultAt?: string; startDelayMs?: number; waitFor?: "ready" | "listening" } = {}): Promise<void> {
    this.owner = await startOwner({ strategy: this.strategy.name, store: this.s, ...opts });
  }
  /** `n` completers over which concurrent calls are spread (sockets for the in-process completer; the separate-process one holds no connection). */
  async connect(n = CONNECTIONS): Promise<Completer[]> {
    this.pool = await Promise.all(Array.from({ length: n }, () => this.factory(this.s.socket)));
    return this.pool;
  }
  closePool(): void {
    for (const c of this.pool) c.close();
    this.pool = [];
  }
  /** The store as the crash (here: our SIGKILL) leaves it, read by a fresh reader. */
  async killAndInspect() {
    this.closePool();
    await killNow(this.owner);
    return this.strategy.inspect(this.s.store, GATE);
  }
  cleanup(): void {
    this.closePool();
    this.s.cleanup();
  }
}

/** `only` limits the run to some kinds (the registry registers one scenario per kind so `--only race` runs only the race); the different-process variant runs them all. */
export async function runExactlyOnce(strategy: Strategy, factory: CompleterFactory = inProcess, separate = false, only?: ScenarioKind[]): Promise<ScenarioResult[]> {
  const out: ScenarioResult[] = [];
  const want = (k: ScenarioKind): boolean => !only || only.includes(k);
  const mk = (id: string, kind: ScenarioKind, guarantee: Guarantee) => (violated: Invariant[], passed: boolean, detail: string, counts?: Record<string, number>): ScenarioResult => ({
    scenario: separate ? `different-process:${id}` : id,
    kind: separate ? "different-process" : kind,
    guarantee,
    strategy: strategy.name,
    ran: true,
    passed: passed && violated.length === 0,
    violated,
    detail,
    counts,
  });
  const notRun = (id: string, kind: ScenarioKind, guarantee: Guarantee, why: string): ScenarioResult => ({ scenario: separate ? `different-process:${id}` : id, kind: separate ? "different-process" : kind, guarantee, strategy: strategy.name, ran: false, passed: false, violated: [], detail: why });
  const settleWith = async (c: Completer, key = KEY, move = MOVE): Promise<Outcome> => c.submit(GATE, key, move);

  // b — repeat, concurrent
  if (want("repeat")) {
    const c = new Case(strategy, factory);
    const r = mk("repeat:concurrent", "repeat", "b");
    try {
      await c.start();
      const pool = await c.connect();
      await pool[0]!.open(GATE);
      const rs = await Promise.all(Array.from({ length: REPEATS }, (_, i) => pool[i % pool.length]!.submit(GATE, KEY, MOVE)));
      const t = tally(rs);
      const i = await c.killAndInspect();
      const same = t.repeat.every((x) => x.status === "repeat" && x.record.key === KEY && sameMove(x.record.move, MOVE));
      const bad: Invariant[] = [...checkInvariants(i)];
      if (i.records.length > 1 || t.committed.length > 1) bad.push("I4");
      const ok = t.committed.length === 1 && t.repeat.length === REPEATS - 1 && t.refused.length === 0 && same && i.records.length === 1;
      out.push(r([...new Set(bad)].sort() as Invariant[], ok, `${REPEATS} concurrent submissions of one key: ${t.committed.length} committed, ${t.repeat.length} repeat, ${t.refused.length} refused; ${i.records.length} record(s) in the store${same ? "" : "; a repeat did not name the committed record"}${t.refused.length ? `; first refusal: ${JSON.stringify(t.refused[0])}` : ""}`, { requests: REPEATS, committed: t.committed.length, repeat: t.repeat.length, refused: t.refused.length, records: i.records.length }));
    } finally {
      c.cleanup();
    }
  }

  // b — repeat, after a restart
  if (want("repeat")) {
    const c = new Case(strategy, factory);
    const r = mk("repeat:after-restart", "repeat", "b");
    try {
      await c.start();
      let pool = await c.connect(1);
      await pool[0]!.open(GATE);
      const first = await settleWith(pool[0]!);
      c.closePool();
      await killNow(c.owner);
      await c.start();
      pool = await c.connect();
      const rs = await Promise.all(Array.from({ length: REPEATS }, (_, i) => pool[i % pool.length]!.submit(GATE, KEY, MOVE)));
      const t = tally(rs);
      const i = await c.killAndInspect();
      const bad: Invariant[] = [...checkInvariants(i)];
      if (i.records.length > 1 || t.committed.length > 0) bad.push("I4");
      const ok = first.status === "committed" && t.committed.length === 0 && t.repeat.length === REPEATS && i.records.length === 1;
      out.push(r([...new Set(bad)].sort() as Invariant[], ok, `settled, killed, restarted; ${REPEATS} further submissions of the same key: ${t.committed.length} committed, ${t.repeat.length} repeat, ${t.refused.length} refused; ${i.records.length} record(s)${t.refused.length ? `; first refusal: ${JSON.stringify(t.refused[0])}` : ""}`, { requests: REPEATS, committed: t.committed.length, repeat: t.repeat.length, refused: t.refused.length, records: i.records.length }));
    } finally {
      c.cleanup();
    }
  }

  // b — same key, different move
  if (want("conflict")) {
    const c = new Case(strategy, factory);
    const r = mk("conflict:key", "conflict", "b");
    try {
      await c.start();
      const [cl] = await c.connect(1);
      await cl!.open(GATE);
      const first = await settleWith(cl!);
      const other: Move = { ...MOVE, kind: "reject" };
      const second = await settleWith(cl!, KEY, other);
      const st = await cl!.state(GATE);
      const i = await c.killAndInspect();
      const named = second.status === "refused" && second.reason === "key-conflict" && second.original === KEY;
      const unchanged = st.state === "settled" && sameMove(st.record.move, MOVE) && i.records.length === 1 && sameMove(i.records[0]!.move, MOVE);
      out.push(r(checkInvariants(i), first.status === "committed" && named && unchanged, `committed(K, ${MOVE.kind}); then (K, ${other.kind}): ${JSON.stringify(second)}; the stored move is ${i.records[0]?.move.kind}`, { records: i.records.length }));
    } finally {
      c.cleanup();
    }
  }

  // c — race, distinct keys
  if (want("race")) {
    const c = new Case(strategy, factory);
    const r = mk("race:distinct-keys", "race", "c");
    try {
      await c.start();
      const pool = await c.connect();
      await pool[0]!.open(GATE);
      const kinds = ["approve", "revise", "reject"] as const;
      const rs = await Promise.all(Array.from({ length: RACERS }, (_, n) => pool[n % pool.length]!.submit(GATE, `race-${n}`, { kind: kinds[n % 3]!, decidedBy: `person-${n}`, briefRef: "brief:spike" })));
      const t = tally(rs);
      const winner = t.committed[0]?.status === "committed" ? t.committed[0].record : undefined;
      const i = await c.killAndInspect();
      const losersNameWinner = t.refused.every((x) => x.status === "refused" && (x.reason === "lost-race" || x.reason === "stale") && x.winner === winner?.key);
      const bad: Invariant[] = [...checkInvariants(i)];
      if (i.records.length > 1 || t.committed.length > 1) bad.push("I4");
      const ok = t.committed.length === 1 && t.refused.length === RACERS - 1 && t.repeat.length === 0 && losersNameWinner && i.records.length === 1 && i.records[0]?.key === winner?.key;
      out.push(r([...new Set(bad)].sort() as Invariant[], ok, `${RACERS} distinct keys at once: ${t.committed.length} committed, ${t.refused.length} refused${losersNameWinner ? ", each naming the winner" : "; a refusal did not name the winner or used another reason"}; ${i.records.length} record(s)${t.repeat.length ? `; ${t.repeat.length} unexpected repeat` : ""}`, { requests: RACERS, committed: t.committed.length, refused: t.refused.length, records: i.records.length }));
    } finally {
      c.cleanup();
    }
  }

  // c — stale
  if (want("conflict")) {
    const c = new Case(strategy, factory);
    const r = mk("conflict:stale", "conflict", "c");
    try {
      await c.start();
      const [cl] = await c.connect(1);
      await cl!.open(GATE);
      const first = await settleWith(cl!);
      const late = await settleWith(cl!, "late-key", { kind: "revise", decidedBy: "someone-else", briefRef: "brief:spike" });
      const i = await c.killAndInspect();
      const ok = first.status === "committed" && late.status === "refused" && late.reason === "stale" && late.winner === KEY && i.records.length === 1 && i.records[0]?.key === KEY;
      out.push(r(checkInvariants(i), ok, `a move to a gate settled by "${KEY}": ${JSON.stringify(late)}; the store still holds "${i.records[0]?.key}"`, { records: i.records.length }));
    } finally {
      c.cleanup();
    }
  }

  // c — invalid move
  if (want("conflict")) {
    const c = new Case(strategy, factory);
    const r = mk("conflict:invalid-move", "conflict", "c");
    try {
      await c.start();
      const [cl] = await c.connect(1);
      await cl!.open(GATE);
      const noDecider = await settleWith(cl!, "k-invalid", { ...MOVE, decidedBy: "" });
      const blank = await settleWith(cl!, "k-blank", { ...MOVE, decidedBy: "   " });
      const bogus = await settleWith(cl!, "k-bogus", { ...MOVE, kind: "delete" as never });
      const st = await cl!.state(GATE);
      const i = await c.killAndInspect();
      const isInvalid = (o: Outcome) => o.status === "refused" && o.reason === "invalid-move";
      out.push(r(checkInvariants(i), isInvalid(noDecider) && isInvalid(blank) && isInvalid(bogus) && st.state === "waiting" && i.records.length === 0, `empty decidedBy → ${JSON.stringify(noDecider)}; blank → ${blank.status}/${(blank as { reason?: string }).reason}; unknown kind → ${bogus.status}/${(bogus as { reason?: string }).reason}; the gate is "${st.state}", ${i.records.length} record(s)`, { records: i.records.length }));
    } finally {
      c.cleanup();
    }
  }

  // c — unknown gate
  if (want("conflict")) {
    const c = new Case(strategy, factory);
    const r = mk("conflict:unknown-gate", "conflict", "c");
    try {
      await c.start();
      const [cl] = await c.connect(1);
      await cl!.open(GATE);
      const lost = await cl!.submit("no-such-gate", KEY, MOVE);
      const st = await cl!.state("no-such-gate");
      const i = await c.killAndInspect();
      out.push(r(checkInvariants(i), lost.status === "refused" && lost.reason === "unknown-gate" && st.state === "unknown" && i.records.length === 0, `a move to a gate never opened: ${JSON.stringify(lost)}; its state is "${st.state}"; the opened gate has ${i.records.length} record(s)`));
    } finally {
      c.cleanup();
    }
  }

  // c — not ready (the startup race)
  if (want("conflict")) {
    const c = new Case(strategy, factory);
    const r = mk("conflict:not-ready", "conflict", "c");
    try {
      await c.start({ startDelayMs: 900, waitFor: "listening" });
      const [cl] = await c.connect(1);
      const early = await settleWith(cl!);
      const ready = await Promise.race([c.owner.whenReady, new Promise<boolean>((res) => setTimeout(() => res(false), 10_000).unref())]);
      if (!ready) {
        out.push(notRun("conflict:not-ready", "conflict", "c", "the owner never became ready"));
      } else {
        await cl!.open(GATE);
        const later = await settleWith(cl!);
        const i = await c.killAndInspect();
        out.push(r(checkInvariants(i), early.status === "refused" && early.reason === "not-ready" && later.status === "committed" && i.records.length === 1, `during startup: ${JSON.stringify(early)}; once ready the same key: ${later.status}; ${i.records.length} record(s)`, { records: i.records.length }));
      }
    } finally {
      c.cleanup();
    }
  }

  // c — a store failure at the moment of writing
  if (want("store-error")) {
    const c = new Case(strategy, factory);
    const r = mk("store-error:store-write", "store-error", "c");
    try {
      await c.start({ faultAt: "store-write" });
      let [cl] = await c.connect(1);
      await cl!.open(GATE);
      const failed = await settleWith(cl!);
      const st = await cl!.state(GATE);
      const afterFault = await c.killAndInspect();
      await c.start(); // no fault this time
      [cl] = await c.connect(1);
      const retried = await settleWith(cl!);
      const final = await c.killAndInspect();
      const bad = [...new Set([...checkInvariants(afterFault), ...checkInvariants(final)])].sort() as Invariant[];
      const ok = failed.status === "refused" && failed.reason === "store-error" && st.state === "waiting" && afterFault.records.length === 0 && retried.status === "committed" && final.records.length === 1;
      out.push(r(bad, ok, `injected store failure: ${JSON.stringify(failed).slice(0, 110)}; gate "${st.state}", ${afterFault.records.length} record(s) after a restart; the same key without the fault: ${retried.status}; ${final.records.length} record(s)`, { recordsAfterFault: afterFault.records.length, recordsFinal: final.records.length }));
    } finally {
      c.cleanup();
    }
  }
  return out;
}
