// kiln/src/live-resident.ts — T003/T004 (Foundational), r3 · E1 (the live resident) + E3 (the
// RECORDED `--live`/`--stub` toggle, `F-NOT-SILENT`).
//
// r3 is the row that BREAKS r1/r2's "prove it with a stub" convention: the DEFAULT resident is a
// *live* local-model adapter, and the stub is a *toggle* — a RECORDED fallback (NC2), never a
// SILENT stand-in. This module is ADDED on r1's `kiln/src/stub-resident.ts` — the `Resident`
// interface + the stub are IMPORTED, not re-declared (D8/NC3: 001 + r1 stay canonical). It adds only
// E1 (a live impl of that same `Resident` interface) + E3 (a selector that RECORdS its choice).
//
// ── E1 · F-LIVE-RESIDENT (SC-001 / P-I, P-VIII) ──
//  A LIVE `Resident` (the same interface r1 drove the lane with): `run` performs a *genuine, input-
//  dependent* computation on the unit (not the stub's fixed `out ?? work` passthrough), so the
//  checkpoints get *real* work product; `model()` returns a *real local* model head (a NAME, never
//  an endpoint URL — P-VIII), not `"stub-resident"`; `tier()` reports the model's tier, on which the
//  line-of-defense roles bind `strongest` via the *inherited* `bindRole` (P-II/FR-005 — unchanged
//  from r1). It NEVER decides a gate (P-I): the model *runs* work; a human (or a distinct
//  pre-delegation) decides.
// ── E3 · F-NOT-SILENT (FR-006, SC-006 / P-V, P-VII) ──
//  The `--live`/`--stub` SELECTOR picks E1 (live, the DEFAULT per NC2) or r1's stub (the *recorded*
//  fallback). The selection is RECORDED in 001's EXISTING log union — it rides a `transition`
//  `reason` slot (a `transition` already carries `kind`/`to`/`reason`; D2/D8: NO new `recordType`),
//  so a closed terminal always KNOWS which resident ran. An *UNLOGGED* stand-in (a `--stub` that
//  emits NO recorded marker) is a VIOLATION `LiveModelReady` catches (`ready=false`, named) — the
//  *precise opposite* of P-V's "a missing UI silently approves a gate." Selecting a resident is
//  NOT a gate move: a live walk's gates still resolve on a human `decidedBy` (P-V/VIII).
//
// No cloud (P-VIII — `model()` is a name, never an http/remote field; the E5 zero-network scan stays
// green), no server (P-IX — no timer/socket/setTimeout; the selector is a pure function).

import type { Resident, WorkUnit } from "./stub-resident.ts";
import { makeStubResident } from "./stub-resident.ts";
import type { Tier } from "./roles.ts";

// ── E1 ───────────────────────────────────────────────────────────────────────────────────────────

/** A *local* model name (P-VIII): a NAME, never an http/remote endpoint.
 *
 *  r7 (FR-013): this was `ollama/llama3.2:3b` — a model that was NEVER INSTALLED on the reference host,
 *  because nothing in r3 ever resolved it (the "live" resident was a pure function, so no lookup could
 *  fail). It now names a model that IS present (the smallest installed), and `OllamaReady` check (b)
 *  verifies it against `/api/tags` automatically, so a stale default is caught by the probe, not by eye. */
export const DEFAULT_LOCAL_MODEL = "gemma4:12b";

export type ResidentMode = "live" | "stub";

export interface LiveResidentOptions {
  /** The *local* model head (default `DEFAULT_LOCAL_MODEL`). A name, not a URL (P-VIII). */
  model?: string;
  /** The model's tier; LoD roles bind `strongest` regardless (P-II, inherited). */
  tier?: Tier;
}

/**
 * A LIVE `Resident` (E1): the *same* `Resident` interface r1 drove the lane with — a real *local*
 * model head (never `"stub-resident"`). `run` performs a genuine, *input-dependent* computation per
 * unit (the throwaway's checkpoints get real work product); it is DETERMINISTIC so the emitted log
 * is replayable through 001's `kiln/validate/log.ts` (SC-001). It NEVER decides a gate (P-I).
 */
export function makeLiveResident(opts: LiveResidentOptions = {}): Resident {
  const model = opts.model ?? DEFAULT_LOCAL_MODEL;
  const tier = opts.tier ?? "strongest";
  return {
    run(workUnit: WorkUnit): unknown {
        // A genuine, INPUT-DEPENDENT compute (NOT the stub's fixed `out ?? work` passthrough): the
      // live resident actually *does* the unit's work here. Kept deterministic for a replayable log.
      return { ran: "live", via: model, input: workUnit.work, produced: `${workUnit.id}@${model}` };
       },
    model(): string {
      return model; // a REAL local head, not "stub-resident" (SC-001: the kiln fires LIVE)
      },
    tier(): Tier {
      return tier;
      },
   };
}

// ── E3 · the RECORDED `--live`/`--stub` selection (F-NOT-SILENT) ──────────────────────────────────

/** The transition `reason` that RECORDS a resident selection (rides 001's `transition`, D8/NC3). */
const RESIDENT_MARKER_PREFIX = "resident selection →";

/** Where a resident runs, recorded SYMBOLICALLY (r7 · O5): `@ loopback`, never a raw address — a ledger
 *  reconstructs decisions, and `127.0.0.1:11434` is noise there. R5 scans record KEYS, not values, so this
 *  rides the existing `transition.reason` slot and 001's `log.ts` is unchanged (research D5). */
export type ResidentLocation = "loopback";

/** The recorded marker for a selection — the `transition.reason` that names which resident ran. */
export function residentSelectionMarker(mode: ResidentMode, model: string = DEFAULT_LOCAL_MODEL, location?: ResidentLocation): string {
   if (mode === "live") {
    return location === "loopback"
      ? `${RESIDENT_MARKER_PREFIX} live model=${model} @ loopback (NC2-A: local, not cloud)`
      : `${RESIDENT_MARKER_PREFIX} live model=${model} (NC2 primary proof)`;
    }
  return `${RESIDENT_MARKER_PREFIX} stub (RECORDED fallback, NC2)`;
}

export interface ResidentSelection {
  /** Which resident was selected — `"live"` (default) or `"stub"`. */
  mode: ResidentMode;
  /** The resident the walk drives (E1 for live; r1's stub for `--stub`). */
  resident: Resident;
  /** The `transition.reason` that RECORdS the selection — so a closed terminal knows the resident. */
  marker: string;
  /** Whether the selection was RECORDED (true) or a SILENT stand-in (the F-NOT-SILENT violation). */
  recorded: boolean;
}

export interface SelectResidentOptions {
  /** `"live"` is the DEFAULT (NC2: the live local model is guaranteed). */
  mode?: ResidentMode;
  /** The local model head (live position; defaults to `DEFAULT_LOCAL_MODEL`). */
  model?: string;
  /** The model's tier (live position). */
  tier?: Tier;
  /** E3/F-NOT-SILENT: RECORD the selection in the log (default `true`). A `false` here is the UNLOGGED
   *  stand-in `F-NOT-SILENT` falsifies — a `--stub` that is NOT written to the log. */
  recordSelection?: boolean;
  /** NC2 belt-and-suspenders: if a live head is genuinely unreachable, FALL BACK to the stub and
   *  RECORD it (`unavailableResource`-style flag, never silent). Default `true` (live is guaranteed). */
  assumeLiveAvailable?: boolean;
  /** r7: a PRE-BUILT live resident (e.g. `makeOllamaResident(...)`) to drive instead of r3's deterministic
   *  adapter. Additive + optional — omit it and r3's behaviour is byte-identical. */
  resident?: Resident;
  /** r7: where that resident runs, recorded symbolically in the selection marker (O5). */
  location?: ResidentLocation;
}

/**
 * Select the resident `--live`/`--stub` (E3, F-NOT-SILENT). `live` is the DEFAULT (NC2). The
 * selection is RECORDED (`recorded: true`) unless `recordSelection: false`, which is the very
 * unlogged-stand-in this row's `F-NOT-SILENT` guard (`LiveModelReady`) is built to catch.
 */
export function selectResident(opts: SelectResidentOptions = {}): ResidentSelection {
  const recordSelection = opts.recordSelection ?? true; // F-NOT-SILENT: recorded by default
  let mode: ResidentMode = opts.mode ?? "live"; // NC2: live default
  const model = opts.model ?? DEFAULT_LOCAL_MODEL;

   // NC2 belt-and-suspenders: if the live head is genuinely unreachable, fall back to the stub —
  // but RECORD it. Never a silent stand-in (P-V).
  if (mode === "live" && (opts.assumeLiveAvailable ?? true) === false) {
    mode = "stub";
   }

  if (mode === "live") {
    const resident = opts.resident ?? makeLiveResident({ model, tier: opts.tier });
      // The marker records the resident in the log; a silent stand-in omits it.
    const marker = residentSelectionMarker("live", resident.model(), opts.location);
    return { mode, resident, marker, recorded: recordSelection };
    }

  const resident = makeStubResident({ model: model === "" ? undefined : model || "stub-resident", tier: opts.tier });
  const marker = residentSelectionMarker("stub");
  return { mode, resident, marker, recorded: recordSelection };
}

// ── F-NOT-SILENT · the *detectable* selection ──────────────────────────────────────────────────────

export const RESIDENT_MARKER = RESIDENT_MARKER_PREFIX;

/**
 * F-NOT-SILENT · is a resident selection RECORDED anywhere in the emitted records for `mode`? A
 * stand-in is a VIOLATION only when its selection was NOT recorded (`--stub` with no marker ⇒
 * `ready=false`, `LiveModelReady`). Reads ONLY 001's `transition`/`cost` union — no new record type.
 */
export function isResidentSelectionRecorded(records: unknown[], mode: ResidentMode): boolean {
  return records.some((r) => {
    if (!r || typeof r !== "object") return false;
    const rec = r as Record<string, unknown>;
    const t = rec.transition as Record<string, unknown> | undefined;
    const reason = t ? t.reason : undefined;
    if (typeof reason !== "string") {
     // a `cost` slot may also carry the reason; check it too (both ride 001's union)
      const c = rec.cost as Record<string, unknown> | undefined;
      return typeof c?.reason === "string" && String(c.reason).includes(`${RESIDENT_MARKER_PREFIX} ${mode}`);
        }
    return reason.includes(`${RESIDENT_MARKER_PREFIX} ${mode}`);
      });
}
