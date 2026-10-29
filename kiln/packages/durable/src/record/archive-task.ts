// The `kiln.archive` task (research R12, contracts/archive.md, Clarification Q4): a finished feature is archived BY THE FACTORY, as its own recorded step after the walk\'s last event.
//   export  → writes the checksummed file beside the store (temp file, fsync, rename)
//   verify  → re-reads it and recomputes the checksum and the counts
//   commit  → ONE commit: `feature.archived`, the tombstones, `kiln.archive/<feature>`, and the task\'s own end
// The library cannot delete a document or a task, so "compacted" means a feature\'s brief contents and move notes are replaced by small tombstones that keep their digests; nothing is compacted before
// `verify` has passed. Created in the SAME commit as the walk\'s end (so every ended walk has its archive task, and only an ended walk has one); a failure is recorded by name in `kiln.archive/<feature>`
// and retried when the factory next starts (`ensureArchives`) — never at the cost of the walk\'s end, another feature, or the feature itself (it stays whole).
import type { Services } from "../services.ts";
import { defineKilnTask, type TaskKind } from "../store.ts";
import type { MoveDocData, BriefDocData } from "../gate/documents.ts";
import { ENDED, walkDoc, type WalkDoc } from "../walk/doc.ts";
import { appendEvent } from "./append.ts";
import { exportFeature, verifyArchive, writeArchive, type ArchiveCounts, type ArchivedFile } from "./archive.ts";
import { collect, fromReader, readRun } from "./read.ts";
import { digestOf } from "./refs.ts";

export interface ArchiveInput { feature: string; /** The sequence number of the event that ended the walk: the cause of `feature.archived`. */ endSeq: number }
type Carried = { file: ArchivedFile; counts: ArchiveCounts; keys: string[]; gates: string[]; /** The last sequence number of the run the file holds: the commit refuses to compact a run that has moved on. */ headSeq: number };
type ArchiveCheckpoint = { phase: "export" } | ({ phase: "verify" } & Carried) | ({ phase: "commit" } & Carried);
export interface ArchiveDoc {
  status?: "archived" | "failed";
  archive?: string;
  sha256?: string;
  bytes?: number;
  at?: number;
  counts?: ArchiveCounts;
  /** The feature-level and gate move keys the archive carries: a key does not become reusable because its feature was archived (FR-062). */
  keys?: string[];
  error?: string;
}

export function archiveKind(s: Services, dir: string): TaskKind<ArchiveInput, ArchiveCheckpoint, { archived: boolean }> {
  /** The failure is recorded by name and the task ends; the feature stays whole and the next start tries again. */
  async function fail(run: { commit: (c: any) => Promise<void> }, feature: string, e: unknown): Promise<void> {
    const message = e instanceof Error ? `${(e as { code?: string }).code ?? e.name}: ${e.message}` : String(e);
    await run.commit(async (tx: any) => {
      const mark = await tx.doc("kiln.archive", feature, {});
      if (mark.status === "archived") return { status: "terminal", outcome: { status: "completed", result: { archived: true } } };
      Object.assign(mark, { status: "failed", error: message.slice(0, 500), at: s.now() });
      return { status: "terminal", outcome: { status: "completed", result: { archived: false } } };
    });
  }
  return defineKilnTask<ArchiveInput, ArchiveCheckpoint, { archived: boolean }>({
    name: "kiln.archive",
    version: 1,
    initial: () => ({ phase: "export" }),
    phases: {
      export: async (task, run) => {
        const { feature } = task.input;
        try {
          const content = await exportFeature(s.store, feature);
          const gates = content.lines.map((l) => JSON.parse(l)).filter((r) => r.kind === "doc" && r.name === "kiln.gate").map((r) => r.key as string);
          const file = await writeArchive(dir, content);
          await s.hooks.at("archive.export-written"); // the file is on disk, nothing recorded: a kill here writes the same bytes again
          const headSeq = (JSON.parse(content.lines[0]) as { headSeq: number }).headSeq;
          await run.commit(() => ({ status: "running", checkpoint: { phase: "verify", file, counts: content.counts, keys: content.keys, gates, headSeq } }));
        } catch (e) {
          await fail(run, feature, e);
        }
      },
      verify: async (task, run) => {
        const { feature } = task.input;
        const { file, counts } = task.checkpoint;
        try {
          await verifyArchive(dir, file, counts);
          await s.hooks.at("archive.verified"); // the archive is proven whole; nothing is compacted yet
          await run.commit(() => ({ status: "running", checkpoint: { ...task.checkpoint, phase: "commit" } }));
        } catch (e) {
          await fail(run, feature, e);
        }
      },
      commit: async (task, run) => {
        const { feature, endSeq } = task.input;
        const { file, counts, keys, gates, headSeq } = task.checkpoint;
        try {
          await run.commit(async (tx) => {
            const mark = await tx.doc<ArchiveDoc>("kiln.archive", feature, {});
            if (mark.status === "archived") return { status: "terminal", outcome: { status: "completed", result: { archived: true } } }; // exactly once
            // the file holds the run up to `headSeq`; if the run has moved on since (an event appended between export and now) the file is stale: nothing is compacted, the export is made again
            const seqs = (await tx.doc<{ seqs: number[] }>("kiln.record", `run:${feature}`, { seqs: [] })).seqs;
            if (seqs.length > 0 && seqs[seqs.length - 1] > headSeq) return { status: "running", checkpoint: { phase: "export" } }; // (a run that lives wholly in the old outbox has no index: nothing can have moved on)
            await appendEvent(tx, { type: "feature.archived", subject: feature, at: s.now(), actor: "system", cause: "", causeEvent: endSeq, data: { archive: file.name, sha256: file.sha256, bytes: file.bytes, counts } });
            for (const gateId of gates) {
              const brief = await tx.doc<BriefDocData & { archivedIn?: string }>("kiln.brief", gateId, {});
              if (brief.content !== undefined && brief.archivedIn === undefined) { brief.content = { archived: true }; brief.archivedIn = file.name; }
              const move = await tx.doc<MoveDocData>("kiln.move", gateId, { record: null });
              if (move.record?.move.note !== undefined) { move.record.move.noteDigest = digestOf(move.record.move.note); delete move.record.move.note; }
              if (move.withdrawn && (move.withdrawn as { note?: string }).note !== undefined) { const w = move.withdrawn as { note?: string; noteDigest?: string }; w.noteDigest = digestOf(w.note!); delete w.note; }
            }
            const wd = await walkDoc(tx, feature);
            for (const rec of Object.values(wd.moves ?? {})) if (rec.move.note !== undefined) { rec.move.noteDigest = digestOf(rec.move.note); delete rec.move.note; }
            Object.assign(mark, { status: "archived", archive: file.name, sha256: file.sha256, bytes: file.bytes, at: s.now(), counts, keys });
            delete mark.error;
            if (tx.hooks) await tx.hooks.at("archive.commit-after-write"); // mid-commit: the tombstones are written in the callback, nothing is stored yet
            return { status: "terminal", outcome: { status: "completed", result: { archived: true } } };
          });
          await s.hooks.at("archive.committed");
        } catch (e) {
          await fail(run, feature, e);
        }
      },
    },
    abort: async (_task, run) => {
      await run.commit(() => ({ status: "terminal", outcome: { status: "aborted" } }));
    },
  });
}

/**
 * At start: every walk that has ended and has no archive — or whose last attempt failed — and no live archive task gets one. This is the retry ("retried when the factory next starts") and the net under
 * the commit-time creation. Idempotent: a walk with an archive or a live task is skipped.
 */
export async function ensureArchives(s: Services): Promise<number> {
  const live = new Set((await s.store.tasks({ kind: "kiln.archive" })).filter((t) => t.status !== "terminal").map((t) => (t.input as ArchiveInput).feature));
  let made = 0;
  for (const w of await s.store.docs<WalkDoc>("kiln.walk")) {
    const feature = w.key;
    if (!(ENDED as readonly string[]).includes(w.value.status ?? "") || live.has(feature)) continue;
    const mark = await s.store.snapshot<ArchiveDoc>("kiln.archive", feature);
    if (mark?.status === "archived") continue;
    const events = await collect(readRun(fromReader(s.store), feature));
    const end = [...events].reverse().find((e) => e.type === "walk.completed" || e.type === "walk.left-lane" || e.type === "walk.not-admitted");
    if (!end) continue;
    await s.store.commit(async (tx) => {
      const again = await tx.doc<ArchiveDoc>("kiln.archive", feature, {});
      if (again.status === "archived") return;
      await tx.createTask("kiln.archive", { feature, endSeq: end.seq } as never, { kind: "factory" });
    });
    made++;
  }
  return made;
}
