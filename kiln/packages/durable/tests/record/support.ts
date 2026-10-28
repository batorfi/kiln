// Test support for the record tests: an in-process store (no factory, no tasks) and small event drafts.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openStore } from "#durable/library/open.ts";
import type { Store } from "#durable/store.ts";
import type { EventDraft } from "#durable/record/append.ts";

export async function withStore(run: (s: Store, dir: string) => Promise<void>): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), "k15-rec-"));
  const store = await openStore({ dir, kinds: [] });
  try {
    await run(store, dir);
  } finally {
    await store.close().catch(() => {});
    rmSync(dir, { recursive: true, force: true });
  }
}

let n = 0;
/** A valid `walk.completed` draft in feature `f` (override any field). */
export const draft = (over: Partial<EventDraft> = {}): EventDraft => ({ type: "walk.completed", subject: "f", at: Date.UTC(2026, 9, 28, 10, 0, 0) + 1000 * n++, actor: "human@r15-script", cause: `k${n}`, data: { approved: ["1-concept"] }, ...over });
