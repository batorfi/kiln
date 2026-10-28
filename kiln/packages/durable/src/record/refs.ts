// References to text kept elsewhere in the store (Clarification Q1, research R6): the record carries a locator and a digest, never the text. `resolve` reads the text back from where it lives —
// the move record, the walk document or the row's input — and, once a feature is archived, from its archive (archive.ts supplies that fallback).
import type { RefLocator } from "#contracts/events/grammar.ts";
import { parseRef, refString } from "#contracts/events/grammar.ts";
import { sha256Hex } from "../canonical.ts";
import type { MoveDocData } from "../gate/documents.ts";
import type { Reader } from "../store.ts";
import type { WalkDoc } from "../walk/doc.ts";

export const digestOf = (text: string): string => sha256Hex(text);

/** `{noteRef, noteDigest}` for `prefix = "note"`. A missing note is the empty text. */
export function pairOf(prefix: string, locator: RefLocator, text: string | undefined): Record<string, string> {
  return { [`${prefix}Ref`]: refString(locator), [`${prefix}Digest`]: digestOf(text ?? "") };
}

/** The text a locator names, or `undefined` when it is not (or no longer) in the live store. */
export async function resolveRef(reader: Pick<Reader, "snapshot" | "tasks">, ref: string): Promise<string | undefined> {
  const loc = parseRef(ref);
  if (!loc) return undefined;
  if (loc.kind === "move") return (await reader.snapshot<MoveDocData>("kiln.move", loc.gateId))?.record?.move.note;
  if (loc.kind === "feature-move") return (await reader.snapshot<WalkDoc>("kiln.walk", loc.feature))?.moves?.[loc.key]?.move.note;
  const row = (await reader.tasks({ kind: "kiln.row" })).find((t) => (t.input as { feature?: string } | null)?.feature === loc.feature);
  return (row?.input as { walk?: { triage?: { reasoning?: string } } } | null)?.walk?.triage?.reasoning;
}

/** The text and whether it matches the digest the event carries. */
export async function resolveChecked(reader: Pick<Reader, "snapshot" | "tasks">, ref: string, digest: string): Promise<{ text: string; matches: boolean } | undefined> {
  const text = await resolveRef(reader, ref);
  return text === undefined ? undefined : { text, matches: digestOf(text) === digest };
}
