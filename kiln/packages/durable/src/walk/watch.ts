// The in-process notifier behind `feature next --after` (walk-contract §7, research R15). It is NOT polling and NOT a source of truth: it only says "something changed for this feature" so a waiting
// request can re-read the STORE and answer. A waiter is a promise with no timer; an owner that closes releases every waiter with an error, which the client sees as a lost connection and retries.
export class Watch {
  private readonly waiters = new Map<string, Set<{ resolve: () => void; reject: (e: Error) => void }>>();
  private closed = false;

  /** Arms a waiter for `feature`: it settles on the next `notify` (or rejects when the owner closes). Arm BEFORE reading the store, so a change between the read and the wait is never lost. */
  arm(feature: string): { promise: Promise<void>; disarm: () => void } {
    if (this.closed) return { promise: Promise.reject(new Error("the owner is closing")), disarm: () => {} };
    let entry!: { resolve: () => void; reject: (e: Error) => void };
    const promise = new Promise<void>((resolve, reject) => (entry = { resolve, reject }));
    promise.catch(() => {}); // a disarmed waiter that is later rejected by close() must not be an unhandled rejection
    const set = this.waiters.get(feature) ?? new Set();
    set.add(entry);
    this.waiters.set(feature, set);
    return { promise, disarm: () => void set.delete(entry) };
  }
  notify(feature: string): void {
    const set = this.waiters.get(feature);
    if (!set) return;
    this.waiters.delete(feature);
    for (const w of set) w.resolve();
  }
  close(): void {
    this.closed = true;
    for (const set of this.waiters.values()) for (const w of set) w.reject(new Error("the owner is closing"));
    this.waiters.clear();
  }
  /** How many waiters are armed (tests assert it returns to 0, i.e. nothing leaks). */
  get size(): number {
    let n = 0;
    for (const s of this.waiters.values()) n += s.size;
    return n;
  }
}
