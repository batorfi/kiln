// kiln/validate/log.ts — T011 (US1): the factory-log validator.
//
// Consumes the canonical schema kiln/schemas/factory-log.schema.json and the
// MoveVocabulary (G3), and enforces the *stream-level* rules that a per-line
// schema cannot: R2 (seq/ts ordering), R3 (no silent approval), R4 (distinct
// pre-delegation), R5 (no cloud/remote field), R6 (trace present). It DOES NOT
// advance a gate or run a lane (SC-006 / Q1=C) — it only READS a stream.
//
// CLI: `node kiln/validate/log.ts <file.jsonl>` — prints PASS or FAIL + reasons.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { validate, isValid, type ValidationError } from "./_core.ts";
import { moveAllowed } from "../contracts/move-vocabulary.ts";
import { nameRecord, nameSeq, nameMove, fmt, PASS } from "./_report.ts";

const SCHEMA_PATH = new URL("../schemas/factory-log.schema.json", import.meta.url);
// R5: any of these keys anywhere in a record is a forbidden cloud/remote reference.
const FORBIDDEN_KEYS = ["url", "https", "http", "cloud", "remote", "endpoint", "apiBase", "baseUrl", "externalUrl"];
// A "flag-not-block" marker for unavailable outside resources is allowed (P-VIII).
const ALLOWED_FLAG_KEYS = new Set(["unavailableresource", "unavailableResource"]);

export interface LogResult {
  valid: boolean;
  failures: string[];
}

function readHeadSchema(): Record<string, unknown> {
  return JSON.parse(readFileSync(SCHEMA_PATH, "utf8")) as Record<string, unknown>;
}

/** R1 per-line JSON + schema conformance. */
export function parseJsonl(text: string, schema: Record<string, unknown>): { records: unknown[]; failures: string[] } {
  const records: unknown[] = [];
  const failures: string[] = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (raw === "") continue; // R1: blank lines are hygiene, ignored
    let obj: unknown;
    try {
      obj = JSON.parse(raw);
     } catch {
      failures.push(fmt(`R1 malformed line ${i + 1}`, `not valid JSON: ${raw.slice(0, 60)}`));
      continue;
     }
    const errs: ValidationError[] = validate(obj, schema);
    if (errs.length > 0) failures.push(fmt(`R1 ${nameRecord((obj as any)?.seq ?? "?", String((obj as any)?.recordType ?? "?"))}`, "", errs));
   else {
      records.push(obj);
     }
   }
  return { records, failures };
}

/** R2: strictly-increasing, gap-free seq; non-decreasing ts. */
export function checkOrdering(records: Record<string, unknown>[]): string[] {
  const failures: string[] = [];
  let prevSeq: number | null = null;
  let prevTs = "";
  for (const r of records) {
    const seq = (r as any).seq;
    const ts = (r as any).ts;
    if (typeof seq !== "number" || !Number.isInteger(seq)) {
      failures.push(fmt("R2 seq", nameSeq(seq, "must be an integer"), []));
     continue;
     }
    if (prevSeq !== null && seq !== prevSeq + 1) failures.push(fmt("R2 seq", nameSeq(seq, `expected ${prevSeq + 1} (strictly increasing, gap-free)`), []));
    prevSeq = seq;
    if (typeof ts === "string" && prevTs !== "" && ts < prevTs) {
      failures.push(fmt("R2 ts", `ts ${ts} is earlier than previous ${prevTs} (must be non-decreasing)`, []));
     }
    if (typeof ts === "string") prevTs = ts;
   }
  return failures;
}

/** G3 + R3/R4: every gate-completion decision needs a decider (human OR a distinct pre-delegation). */
export function checkDecisions(
  records: Record<string, unknown>[],
  allowed: (gate: any, move: string) => boolean,
): string[] {
  const failures: string[] = [];
  // Which gates have a DISTINCT pre-delegation record (R4: a separate recordType).
  const preDelegatedGates = new Set<string>();
  for (const r of records) {
    if (r.recordType === "pre-delegation") {
      const of = String((r as any).preDelegation?.of ?? (r as any).of ?? "");
      if (of) preDelegatedGates.add(of);
     }
   }
  for (const r of records) {
    if (r.recordType !== "gate-completion") continue;
    const gc = (r as any)["gate-completion"] ?? {};
    const gate = gc.gate;
    const move: string = gc.move;
    const seq = (r as any).seq;
    const recType = "gate-completion";

    // G3: move ∈ MoveVocabulary(gate).
    const validGate = gate === "gate0" || (typeof gate === "number" && gate >= 1 && gate <= 9);
    if (!validGate) {
      failures.push(fmt(`G1 ${nameRecord(seq, recType)}`, `gate ${JSON.stringify(gate)} is neither gate0 nor 1..9`));
     continue;
     }
    if (!allowed(gate, move)) {
      failures.push(fmt(`G3 ${nameRecord(seq, recType)}`, nameMove(String(gate), move, [] as any)));
     continue;
     }
    // R3/R4: an approving/corrective decision needs a decider.
    const hasDecider = typeof gc.decidedBy === "string" && gc.decidedBy.startsWith("human@");
    const hasSelfPreDelegation = gc.preDelegation && typeof gc.preDelegation === "object";
    const gateKey = String(gate);
    const hasDistinctPreDelegation = preDelegatedGates.has(gateKey) || preDelegatedGates.has(`${gateKey}`);
    if (!hasDecider && !hasSelfPreDelegation && !hasDistinctPreDelegation) {
      failures.push(
        fmt(
          `R3 ${nameRecord(seq, recType)} (no-silent-approval)`,
          `gate ${gateKey} move "${move}" recorded with NO human decidedBy and NO distinct pre-delegation record — a gate may not silently approve`,
         ),
      );
     continue;
     }
   }
  return failures;
}

/** R5: no record may carry a cloud/remote field; a flagged-unavailable marker is OK. */
export function checkLocalFirst(records: Record<string, unknown>[]): string[] {
  const failures: string[] = [];
  const forKeys = (obj: any, where: string, out: string[]) => {
    if (!obj || typeof obj !== "object") return;
    for (const k of Object.keys(obj)) {
      const norm = k.toLowerCase().replace(/[-_\s]/g, "");
      if (ALLOWED_FLAG_KEYS.has(norm)) continue;
      if (FORBIDDEN_KEYS.some((f) => f.toLowerCase() === norm)) {
        out.push(fmt(`R5 ${where}`, `forbidden cloud/remote field "${k}" (P-VIII local-first)`, []));
       }
      if (obj[k] && typeof obj[k] === "object" && !Array.isArray(obj[k])) forKeys(obj[k], `${where}.${k}`, out);
     }
   };
  for (const r of records) forKeys(r, nameRecord((r as any).seq, String((r as any).recordType)), failures);
  return failures;
}

function checkTrace(schema: Record<string, unknown>): string[] {
  // R6/FR-009: the contract must name its constitution principle(s).
  const t = (schema as any).trace;
  if (typeof t !== "string" || t.trim() === "") return [`R6 ${"contract"}: missing/trace note (FR-009)`];
  return [];
}

export function validateLog(recordsRaw: Record<string, unknown>[], schema?: Record<string, unknown>): LogResult {
  const s = schema ?? readHeadSchema();
  const records = recordsRaw as Record<string, unknown>[];
  const failures: string[] = [];
  failures.push(...checkTrace(s));
  failures.push(...checkOrdering(records));
  failures.push(...checkDecisions(records, (g: any, m: string) => moveAllowed(g as any, m)));
  failures.push(...checkLocalFirst(records));
  return { valid: failures.length === 0, failures };
}

export function validateLogFile(path: string, schema?: Record<string, unknown>): LogResult {
  const s = schema ?? readHeadSchema();
  const parsed = parseJsonl(readFileSync(path, "utf8"), s);
  const records = parsed.records as Record<string, unknown>[];
  const failures: string[] = [...parsed.failures];
  failures.push(...checkTrace(s));
  failures.push(...checkOrdering(records));
  failures.push(...checkDecisions(records, (g: any, m: string) => moveAllowed(g as any, m)));
  failures.push(...checkLocalFirst(records));
  return { valid: failures.length === 0, failures };
}

// ---- CLI entry (T012) ----
function isMain(): boolean {
  try {
    return process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1];
   } catch {
    return false;
   }
}
if (isMain()) {
  const path = process.argv[2];
  if (!path) {
    console.error("usage: node kiln/validate/log.ts <file.jsonl>");
    process.exit(2);
  }
  const res = validateLogFile(path);
  if (res.valid) {
    console.log(PASS);
    process.exit(0);
  } else {
    console.error(res.failures.join("\n"));
    process.exit(1);
  }
}
