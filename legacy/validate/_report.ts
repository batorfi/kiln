// kiln/validate/_report.ts — T006 (Foundational)
//
// Named-error formatting (SC-008: every validation failure names the offending
// seq / record / property). Consumed by log.ts / roadmap.ts / firing-ready.ts.
// These are pure string builders; they DO NOT advance any gate.

export function nameRecord(seq: number, recordType: string): string {
  return `record seq=${seq} (${recordType})`;
}

export function nameSeq(offending: number, expected: string): string {
  return `seq ${offending} ${expected}`;
}

export function nameMove(gate: string, move: string, allowed: readonly string[]): string {
  return `move "${move}" not in MoveVocabulary(gate=${gate}); allowed: [${allowed.join(", ")}]`;
}

export function fmt(
  label: string,
  detail: string,
  errors: { path: string; message: string }[] = [],
): string {
  const lines = [`FAIL — ${label}`];
  if (detail) lines.push(`  ${detail}`);
  for (const e of errors) lines.push(`  · ${e.path}: ${e.message}`);
  return lines.join("\n");
}

export const PASS = "PASS";
