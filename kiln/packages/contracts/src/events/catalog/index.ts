// The catalog (research R4, R5): every event type the factory may commit, with its versioned schema. Pure data.
import type { CatalogEntry } from "./builder.ts";
import { commandEntries } from "./command.ts";
import { delegationEntries } from "./delegation.ts";
import { experienceEntries } from "./experience.ts";
import { featureEntries } from "./feature.ts";
import { gateEntries } from "./gate.ts";
import { laneEntries } from "./lane.ts";
import { recordEntries } from "./record.ts";
import { roadmapEntries } from "./roadmap.ts";
import { systemEntries } from "./system.ts";
import { unitEntries } from "./unit.ts";
import { walkEntries } from "./walk.ts";

export type { CatalogEntry, JsonSchema } from "./builder.ts";

const all: CatalogEntry[] = [...roadmapEntries, ...gateEntries, ...walkEntries, ...unitEntries, ...laneEntries, ...delegationEntries, ...commandEntries, ...featureEntries, ...experienceEntries, ...systemEntries, ...recordEntries];

export const catalog: ReadonlyMap<string, CatalogEntry> = new Map(all.map((e) => [e.type, e]));
export const catalogEntry = (type: string): CatalogEntry | undefined => catalog.get(type);
export { schemaFiles, canonicalPretty } from "./files.ts";
