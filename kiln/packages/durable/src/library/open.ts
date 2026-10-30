// THE one place the library is opened (research R1, R11). Three decisions are made here and nowhere else:
//   1. the crash-loop guard is OFF — `restartLimit = Infinity` — so a waiting gate is never parked by repeated crashes (FR-040);
//   2. the library's required `models` option is built with NO provider: this seam never makes a model request (the only reason `pi-ai` is imported at all);
//   3. the store opens in ONE function, so the experimental built-in SQLite it rests on is guarded in one place (FR-054) and the version guard runs before anything resumes (FR-047).
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context";
import { createModels } from "@earendil-works/pi-ai/models";
import { Harness, ROOT_CONVERSATION_ID, createRegistry, createSession, defineExtension } from "@earendil-works/pi-durable";
import { openNodeSqliteStorage } from "@earendil-works/pi-durable/storage/sqlite/node";
import { checkStoreVersion, STORE_CONTRACT, type StoreRecord } from "../store-version.ts";
import type { DocName, LiveTask, OpenStoreOptions, Reader, Report, Store, TaskLite, Tx } from "../store.ts";
import { DOC_TOKENS } from "./docs.ts";
import { liteTask, toLibraryTask, wrapTx } from "./tasks.ts";
import { INSTALLED_LIBRARY_VERSION } from "./version.ts";

const ctx = BACKGROUND_CONTEXT;
/* eslint-disable @typescript-eslint/no-explicit-any */

export const STORE_FILE = "factory.sqlite";

/**
 * The wait a second connection gets before "database is locked": the library asks for it through `DatabaseSync`'s `timeout` option and its pinned default is 5 s (`tests/busy-timeout.test.ts` compares the
 * connection with this number, so a library upgrade that changes the default shows up there). Every library transaction — a read of one document included — begins `BEGIN IMMEDIATE`, so a second connection
 * (a `kiln record` tool, an inspector, a proof) that meets the owner mid-commit relies on this wait. Node 23.6.0 IGNORES the option (measured: `PRAGMA busy_timeout` stays 0; 22.18, 22.19, 24.1 and 25.9 apply
 * it), which is why 23.x is outside the supported range (`^22.19.0 || >=24.1.0`). The seam sets nothing itself; it REFUSES to open on a Node that does not apply the option (`assertBusyTimeout`).
 */
export const BUSY_TIMEOUT_MS = 5_000;
/** The busy timeout actually in force on this storage's connection. */
export async function busyTimeoutOf(storage: any): Promise<number> {
  return (await storage.db.get("PRAGMA busy_timeout")).timeout as number;
}
/** `npm` only warns about `engines`, so a Node outside the range reaches here: refuse by name, and close the connection, rather than fail later with "database is locked". */
async function assertBusyTimeout(storage: any): Promise<void> {
  const timeout = await busyTimeoutOf(storage);
  if (timeout > 0) return;
  await storage.close(ctx);
  throw new Error(`Node ${process.versions.node} ignores the SQLite busy-timeout option (PRAGMA busy_timeout is ${timeout}): a second connection would fail at once with "database is locked". KILN supports Node ^22.19.0 || >=24.1.0`);
}

export async function openStore(opts: OpenStoreOptions): Promise<Store> {
  mkdirSync(opts.dir, { recursive: true });
  const now = opts.now ?? Date.now;
  const installed = opts.installedLibraryVersion ?? INSTALLED_LIBRARY_VERSION;
  const storage = await openNodeSqliteStorage(join(opts.dir, STORE_FILE));
  await assertBusyTimeout(storage);
  const reports: Report[] = [];
  const byName = new Map<string, any>();
  const seam = { hooks: opts.hooks, onAppended: opts.onAppended };
  for (const kind of opts.kinds as any[]) byName.set(kind.name, toLibraryTask(kind, byName, seam));
  const registry = createRegistry();
  registry.install(defineExtension({ name: "kiln", tasks: [...byName.values()] }));

  const harness = await Harness.open(
    storage,
    {
      models: createModels(), // no provider is ever registered (research R1)
      registry,
      settings: { restartLimit: Infinity }, // FR-040: a waiting gate is never parked by repeated crashes
      now,
      onReport: (info: any) => reports.push({ type: String(info.type), task: info.task ? { id: info.task.id, kind: info.task.kind } : undefined, reason: info.reason }),
    },
    ctx,
  );

  // The commit that CREATES the store records the library version that created it (FR-047); on every later open it is compared BEFORE anything resumes.
  const root = await harness.root(ctx, {
    init: async (tx: any) => {
      const rec: StoreRecord = { libraryVersion: installed, contract: STORE_CONTRACT, createdAt: now() };
      await tx.doc(DOC_TOKENS["kiln.store"], ROOT_CONVERSATION_ID, "main", rec);
    },
  });
  const recorded = (await harness.snapshot(DOC_TOKENS["kiln.store"], ROOT_CONVERSATION_ID, "main", ctx)) as StoreRecord | undefined;
  try {
    checkStoreVersion(opts.dir, recorded?.libraryVersion, installed);
  } catch (e) {
    await harness.close(ctx); // nothing was resumed, nothing was written beyond what the library's own open does
    throw e;
  }

  const reader = readersOver(storage, (name, key) => harness.snapshot(DOC_TOKENS[name], ROOT_CONVERSATION_ID, key, ctx));
  return {
    reports,
    commit: async <T>(change: (tx: Tx) => Promise<T> | T): Promise<T> => {
      let appended = false;
      const out = await root.commit(async (libTx: any) => {
        const tx = wrapTx(libTx, byName, seam);
        const r = await change(tx);
        appended = tx.appended();
        return r;
      }, ctx);
      if (appended) seam.onAppended?.();
      return out;
    },
    snapshot: reader.snapshot,
    docs: reader.docs,
    tasks: reader.tasks,
    live: async (): Promise<LiveTask[]> => (await harness.inspect(ctx)).tasks.map((t: any) => ({ id: t.record.id, kind: t.record.kind, state: t.state.kind })),
    resume: () => harness.resume(),
    busyTimeout: () => busyTimeoutOf(storage),
    close: () => harness.close(ctx),
  };
}

/** The reads shared by an open store and a fresh reader: committed snapshots, whole families, stored tasks. */
function readersOver(storage: any, snap: (name: DocName, key: string) => Promise<unknown>): Pick<Reader, "snapshot" | "docs" | "tasks"> {
  return {
    snapshot: async <T extends object>(name: DocName, key: string): Promise<T | undefined> => (await snap(name, key)) as T | undefined,
    docs: async <T extends object>(name: DocName): Promise<{ key: string; value: T }[]> => {
      const out: { key: string; value: T }[] = [];
      let cursor: any;
      do {
        const page = await storage.scanDocuments({ scope: { kind: "conversation", conversationId: ROOT_CONVERSATION_ID }, at: "current", kind: name }, 200, cursor, ctx);
        for (const rec of page.items) {
          const d = await storage.document(rec.id, "current", ctx);
          if (d) out.push({ key: String(rec.key), value: d.value as T });
        }
        cursor = page.next;
      } while (cursor);
      return out;
    },
    tasks: async (filter?: { kind?: string }): Promise<TaskLite[]> => {
      const out: TaskLite[] = [];
      let cursor: any;
      do {
        const page = await storage.scanTasks(filter?.kind ? { kind: filter.kind } : {}, 200, cursor, ctx);
        out.push(...page.items.map(liteTask));
        cursor = page.next;
      } while (cursor);
      return out;
    },
  };
}

/** A reader with NO owner: opens the same file read-through a bare session, never resumes anything, never compares versions (a diagnosing reader must be able to read an old store). */
export async function openReader(dir: string): Promise<Reader> {
  const storage = await openNodeSqliteStorage(join(dir, STORE_FILE));
  await assertBusyTimeout(storage);
  const session = createSession(storage);
  const r = readersOver(storage, (name, key) => session.snapshot(DOC_TOKENS[name], ROOT_CONVERSATION_ID, key, ctx));
  return { ...r, busyTimeout: () => busyTimeoutOf(storage), close: () => session.close(ctx) };
}
