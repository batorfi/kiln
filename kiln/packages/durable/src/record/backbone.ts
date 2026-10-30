// The in-process backbone (research R8, contracts/backbone-and-projection.md §1): committed events, in order, to registered consumers, each with its own durable cursor.
//   · nothing polls and nothing has a timer: a loop waits for an in-memory signal (`notify`, raised by the seam after a commit that appended) and re-reads the STORE; the signal is never the truth
//   · no commit awaits a consumer: each consumer has its own loop, so a slow, stalled or failing one holds only itself (FR-032)
//   · a transactional consumer\'s effect and its cursor are ONE commit (exactly once); an effect consumer is delivered, then its cursor is committed (at least once, idempotent)
//   · a cursor AHEAD of the record (a restored older store) stops its consumer by name — it never skips forward
import type { Event } from "#contracts/events/types.ts";
import type { Services } from "../services.ts";
import type { Consumer } from "./consumer.ts";
import { cursorDoc, FRESH, readCursor, type Cursor } from "./cursors.ts";
import { fromReader, headOf, readRecord } from "./read.ts";

const BATCH = 256;

export interface ConsumerStatus {
  name: string;
  seq: number;
  head: number;
  lag: number;
  failed?: { seq: number; error: string };
}

interface Loop {
  c: Consumer;
  /** A signal arrived since the last pass. */
  pending: boolean;
  wake: (() => void) | null;
  /** Inside the consumer\'s own code (apply / deliver) — `stop` does not wait for it. */
  busy: boolean;
  halted: boolean;
  done: Promise<void> | null;
}

export class Backbone {
  private readonly s: Services;
  private readonly loops = new Map<string, Loop>();
  private started = false;
  private stopped = false;
  private readonly abort = new AbortController();

  constructor(s: Services) {
    this.s = s;
  }

  /** Registers a consumer; before `start` it waits, after it its loop begins at once. */
  register(c: Consumer): void {
    if (this.loops.has(c.name)) throw new Error(`a consumer named "${c.name}" is already registered`);
    if (c.mode === "transactional" ? !c.apply : !c.deliver) throw new Error(`consumer "${c.name}" is ${c.mode} but has no ${c.mode === "transactional" ? "apply" : "deliver"}`);
    const l: Loop = { c, pending: true, wake: null, busy: false, halted: false, done: null };
    this.loops.set(c.name, l);
    if (this.started && !this.stopped) l.done = this.run(l);
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    for (const l of this.loops.values()) if (!l.done) l.done = this.run(l);
  }

  /** The seam calls this after a commit that appended an event. Cheap, synchronous, never throws. */
  notify(): void {
    for (const l of this.loops.values()) {
      l.pending = true;
      const w = l.wake;
      l.wake = null;
      w?.();
    }
  }

  /** Stops the loops. A loop inside a consumer\'s own code is not waited for: a stalled consumer must not hold the factory\'s close. */
  async stop(): Promise<void> {
    this.stopped = true;
    this.abort.abort();
    this.notify();
    await Promise.all([...this.loops.values()].filter((l) => !l.busy).map((l) => l.done?.catch(() => {})));
  }

  async status(): Promise<ConsumerStatus[]> {
    const head = (await headOf(fromReader(this.s.store))).next - 1;
    const out: ConsumerStatus[] = [];
    for (const l of this.loops.values()) {
      const cur = await readCursor(this.s.store, l.c.name);
      const seq = cur?.seq ?? (l.c.from ?? 1) - 1;
      out.push({ name: l.c.name, seq, head, lag: head - seq, ...(cur?.failed ? { failed: cur.failed } : {}) });
    }
    return out;
  }

  /** Clears a consumer\'s failure and lets its loop try again from the event it stopped at. */
  async retry(name: string): Promise<void> {
    const l = this.loops.get(name);
    if (!l) throw new Error(`no consumer named "${name}"`);
    await this.s.store.commit(async (tx) => {
      const c = await cursorDoc(tx, name);
      delete c.failed;
    });
    if (!l.halted) return; // it is running: nothing to do
    l.halted = false;
    l.pending = true;
    if (this.started && !this.stopped) l.done = this.run(l); // the halted loop has ended; a new one takes over from the same cursor
  }

  // ── one consumer\'s loop ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  private async run(l: Loop): Promise<void> {
    while (!this.stopped && !l.halted) {
      l.pending = false;
      let progressed: boolean;
      try {
        progressed = await this.step(l);
      } catch (e) {
        if (this.stopped) return; // the store is closing under us: nothing to report
        await this.fail(l, e);
        return;
      }
      if (this.stopped) return;
      if (!progressed && !l.pending) await new Promise<void>((resolve) => { l.wake = resolve; if (l.pending || this.stopped) resolve(); });
    }
  }

  /** One batch for one consumer. Returns whether it did anything (false = caught up). */
  private async step(l: Loop): Promise<boolean> {
    const { c } = l;
    const store = this.s.store;
    let cur: Cursor | undefined = await readCursor(store, c.name);
    if (!cur || cur.version !== c.version) {
      // a new consumer, or a new version of one: start from `from` with a fresh cursor, clearing what the old version built (same commit)
      cur = FRESH(c.version, c.from);
      await store.commit(async (tx) => {
        if (c.mode === "transactional") await c.reset?.(tx);
        Object.assign(await cursorDoc(tx, c.name), cur);
      });
    }
    const head = (await headOf(fromReader(store))).next - 1;
    if (cur.seq > head) throw new BackboneError("cursor-ahead-of-head", cur.seq + 1, `the cursor is at ${cur.seq} but the record ends at ${head}: a restored older store? the consumer never skips forward`);
    if (cur.seq === head) return false;

    const batch: Event[] = [];
    for await (const e of readRecord(fromReader(store), { from: cur.seq + 1, to: Math.min(head, cur.seq + BATCH) })) batch.push(e);
    await this.s.hooks.at("backbone.batch-read");
    const last = batch[batch.length - 1].seq;

    l.busy = true;
    try {
      if (c.mode === "transactional") {
        await store.commit(async (tx) => {
          await c.apply!(tx, batch);
          if (tx.hooks) await tx.hooks.at("backbone.apply-after-write"); // mid-commit: the effect is written in the callback, the cursor is not yet advanced
          Object.assign(await cursorDoc(tx, c.name), { seq: last, version: c.version });
        });
        await this.s.hooks.at("backbone.committed");
      } else {
        await c.deliver!(batch, this.abort.signal);
        await this.s.hooks.at("backbone.delivered"); // delivered, cursor not yet advanced: a kill here delivers the batch again
        await store.commit(async (tx) => {
          Object.assign(await cursorDoc(tx, c.name), { seq: last, version: c.version });
        });
      }
    } catch (e) {
      throw e instanceof BackboneError ? e : new BackboneError("consumer-failed", batch[0].seq, (e as Error).message);
    } finally {
      l.busy = false;
    }
    return true;
  }

  /** The consumer stopped at an event: say so in its cursor (never silently) and halt only this loop. */
  private async fail(l: Loop, e: unknown): Promise<void> {
    l.halted = true;
    const f = e instanceof BackboneError ? e : new BackboneError("consumer-failed", 0, (e as Error).message);
    try {
      await this.s.store.commit(async (tx) => {
        const c = await cursorDoc(tx, l.c.name);
        c.failed = { seq: f.seq, error: `${f.code}: ${f.message}` };
        if (c.seq === undefined) Object.assign(c, FRESH(l.c.version, l.c.from));
      });
    } catch {
      /* the store is closing: the failure is lost with the process, and a restart finds it again */
    }
  }
}

export class BackboneError extends Error {
  readonly code: "cursor-ahead-of-head" | "consumer-failed";
  readonly seq: number;
  constructor(code: BackboneError["code"], seq: number, message: string) {
    super(message);
    this.name = "BackboneError";
    this.code = code;
    this.seq = seq;
  }
}
