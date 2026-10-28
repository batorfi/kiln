// The factory's own events (FR-010). Facts only — no pid, no path, nothing that differs between two runs of the same history. Behaviour (emitting them) is a later row's.
import { entry, int, nonEmpty, obj, type CatalogEntry } from "./builder.ts";

const boot = obj({ contract: int, libraryVersion: nonEmpty });
export const systemEntries: CatalogEntry[] = [entry("server.started", boot, false), entry("server.recovered", boot, false), entry("store.migrated", obj({ from: int, to: int }), false)];
