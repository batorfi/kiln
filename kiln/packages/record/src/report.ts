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

// r12 (US3): unlike the first program's copy, this names the flow and lists the allowed moves, as contracts/flow-and-records.md §4 says
// (`… not in MoveVocabulary(gate=6, flow=v1); allowed: approve, restart`). The first program printed `allowed: []`; legacy keeps its own copy.
export function nameMove(gate: string, move: string, allowed: readonly string[], flow?: string): string {
  return `move "${move}" not in MoveVocabulary(gate=${gate}${flow ? `, flow=${flow}` : ""}); allowed: ${allowed.join(", ")}`;
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
