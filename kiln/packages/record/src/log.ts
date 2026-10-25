// packages/record/src/log.ts — the factory-log validator (ported from the first program's validate/log.ts, r12 T021).
//
// Consumes the canonical schema packages/contracts/schemas/factory-log.schema.json and the
// MoveVocabulary (G3), and enforces the *stream-level* rules that a per-line
// schema cannot: R2 (seq/ts ordering), R3 (no silent approval), R4 (distinct
// pre-delegation), R5 (no cloud/remote field), R6 (trace present). It DOES NOT
// advance a gate or run a lane (SC-006 / Q1=C) — it only READS a stream.
//
// Flow (r12 US3): each record is checked against the flow it was made under — `record.flow ?? options.defaultFlow ?? DEFAULT_RECORD_FLOW` (v1: history).
// Never a function's default (that is the CURRENT flow, v2). A gate the flow lacks ("2a"/"6a" under v1) fails G3 by name.
//
// CLI: `node packages/record/src/log.ts <file.jsonl> [--flow v1|v2]` (or `npm run validate:log -- <file.jsonl>`) — prints PASS or FAIL + reasons.

import { readFileSync } from "node:fs";
import { isEntryPoint } from "./entry.ts";
import { validate, isValid, type ValidationError } from "./validate-core.ts";
import { DEFAULT_RECORD_FLOW, flows, hasGate, moveAllowed, moveVocabulary } from "#contracts/flow/index.ts";
import type { FlowVersion } from "#contracts/moves.ts";
import { nameRecord, nameSeq, nameMove, fmt, PASS } from "./report.ts";

const SCHEMA_PATH = new URL("../../contracts/schemas/factory-log.schema.json", import.meta.url);
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
export interface FlowOptions {
  /** The flow a record that names none was made under. Default: v1 (history). A record's own `flow` always wins. */
  defaultFlow?: FlowVersion;
}

export function checkDecisions(
  records: Record<string, unknown>[],
  allowed: (gate: any, move: string, flow: FlowVersion) => boolean,
  options: FlowOptions = {},
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

    // The flow this record was made under: its own field, else the caller's default, else v1 (history).
    const flow = gc.flow ?? options.defaultFlow ?? DEFAULT_RECORD_FLOW;
    if (typeof flow !== "string" || !Object.hasOwn(flows, flow)) {
      failures.push(fmt(`G3 ${nameRecord(seq, recType)}`, `unknown flow ${JSON.stringify(flow)}; known: ${Object.keys(flows).join(", ")}`));
      continue;
    }
    // G3: move ∈ MoveVocabulary(gate, flow).
    const validGate = gate === "gate0" || (typeof gate === "number" && Number.isInteger(gate) && gate >= 1 && gate <= 9) || gate === "2a" || gate === "6a";
    if (!validGate) {
      failures.push(fmt(`G1 ${nameRecord(seq, recType)}`, `gate ${JSON.stringify(gate)} is neither gate0 nor 1..9 (nor 2a / 6a)`));
     continue;
     }
    if (!hasGate(gate, flow as FlowVersion)) {
      failures.push(fmt(`G3 ${nameRecord(seq, recType)}`, `gate ${gate} is not in flow ${flow}`));
      continue;
    }
    if (!allowed(gate, move, flow as FlowVersion)) {
      failures.push(fmt(`G3 ${nameRecord(seq, recType)}`, nameMove(String(gate), move, moveVocabulary(gate, flow as FlowVersion), flow)));
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

export function validateLog(recordsRaw: Record<string, unknown>[], schema?: Record<string, unknown>, options: FlowOptions = {}): LogResult {
  const s = schema ?? readHeadSchema();
  const records = recordsRaw as Record<string, unknown>[];
  const failures: string[] = [];
  failures.push(...checkTrace(s));
  failures.push(...checkOrdering(records));
  failures.push(...checkDecisions(records, (g, m, f) => moveAllowed(g, m, f), options));
  failures.push(...checkLocalFirst(records));
  return { valid: failures.length === 0, failures };
}

export function validateLogFile(path: string, schema?: Record<string, unknown>, options: FlowOptions = {}): LogResult {
  const s = schema ?? readHeadSchema();
  const parsed = parseJsonl(readFileSync(path, "utf8"), s);
  const records = parsed.records as Record<string, unknown>[];
  const failures: string[] = [...parsed.failures];
  failures.push(...checkTrace(s));
  failures.push(...checkOrdering(records));
  failures.push(...checkDecisions(records, (g, m, f) => moveAllowed(g, m, f), options));
  failures.push(...checkLocalFirst(records));
  return { valid: failures.length === 0, failures };
}

// ---- CLI entry (T012) ----
const isMain = (): boolean => isEntryPoint(import.meta.url);
if (isMain()) {
  const argv = process.argv.slice(2);
  const flowAt = argv.indexOf("--flow");
  const flowArg = flowAt >= 0 ? argv[flowAt + 1] : undefined;
  const path = argv.find((a, i) => !a.startsWith("--") && (flowAt < 0 || i !== flowAt + 1));
  const usage = "usage: node packages/record/src/log.ts <file.jsonl> [--flow v1|v2]";
  if (!path || (flowAt >= 0 && (flowArg === undefined || !Object.hasOwn(flows, flowArg))) || argv.some((a) => a.startsWith("--") && a !== "--flow")) {
    console.error(usage);
    process.exit(2);
  }
  const res = validateLogFile(path, undefined, { defaultFlow: flowArg as FlowVersion | undefined });
  if (res.valid) {
    console.log(PASS);
    process.exit(0);
  } else {
    console.error(res.failures.join("\n"));
    process.exit(1);
  }
}
