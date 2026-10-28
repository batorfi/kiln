// The catalog (research R4, R5): every event type the factory may commit, with its versioned schema. Pure data.
import type { CatalogEntry } from "./builder.ts";
import { gateEntries } from "./gate.ts";
import { laneEntries } from "./lane.ts";
import { recordEntries } from "./record.ts";
import { walkEntries } from "./walk.ts";

export type { CatalogEntry, JsonSchema } from "./builder.ts";

const all: CatalogEntry[] = [...gateEntries, ...walkEntries, ...laneEntries, ...recordEntries];

export const catalog: ReadonlyMap<string, CatalogEntry> = new Map(all.map((e) => [e.type, e]));
export const catalogEntry = (type: string): CatalogEntry | undefined => catalog.get(type);
