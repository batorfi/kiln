// The factory-log projection, live (research R9, FR-040/FR-041): one JSONL file per feature run, at <store>/projections/factory-log/<feature>.jsonl, built from the record by the pure reducer.
// An EFFECT consumer: for every run a batch touches it rebuilds that run\'s whole file from its first event and replaces the file atomically (temp file, fsync, rename). Because the result is a
// function of the record alone, a repeat changes nothing (at-least-once is harmless), a kill leaves the old or the new whole file and the repeat repairs it, and the live file cannot differ from a
// rebuild — the reducer is the same one `kiln record rebuild-log` runs. A run whose events produce no line has no file.
import { mkdir, open, rename } from "node:fs/promises";
import { join } from "node:path";
import { fileOf, foldRun } from "#record/projections/factory-log.ts";
import type { Services } from "../../services.ts";
import type { Consumer } from "../consumer.ts";
import { collect, fromReader, readRun } from "../read.ts";

export const FACTORY_LOG_VERSION = 1;
export const logDir = (store: string): string => join(store, "projections", "factory-log");
/** A run\'s file name: its feature, with any character a file name should not carry made safe. */
export const logFile = (store: string, feature: string): string => join(logDir(store), `${feature.replace(/[^A-Za-z0-9._-]/g, "_")}.jsonl`);

/**
 * Writes `text` to `path` so a reader sees the old file or the new one, whole. ASYNCHRONOUS on purpose: a synchronous `fsync` blocks the owner's single thread, and the walk (which shares it) took fourteen
 * times as long while the projection followed it (measured, notes §11) — the projection is a follower and must never hold up what it follows.
 */
export async function writeAtomically(path: string, text: string): Promise<void> {
  const tmp = `${path}.tmp-${process.pid}`;
  const fh = await open(tmp, "w");
  try {
    await fh.writeFile(text);
    await fh.sync();
  } finally {
    await fh.close();
  }
  await rename(tmp, path);
}

export function factoryLogConsumer(s: Services, store: string): Consumer {
  return {
    name: "factory-log",
    version: FACTORY_LOG_VERSION,
    mode: "effect",
    async deliver(batch) {
      const runs = new Set<string>();
      for (const e of batch) if (e.correlation?.startsWith("run:")) runs.add(e.correlation.slice(4));
      if (runs.size === 0) return;
      await mkdir(logDir(store), { recursive: true });
      for (const feature of runs) {
        const lines = foldRun(await collect(readRun(fromReader(s.store), feature)));
        if (lines.length > 0) await writeAtomically(logFile(store, feature), fileOf(lines));
      }
    },
  };
}
