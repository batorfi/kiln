// kiln/pi/port.ts — T004, r8 · research D1 · data-model E1–E4 · contracts/pi-seam.md S1.
//
// KILN's OWN structural view of the small part of Pi it touches. THIS FILE IMPORTS NOTHING — not Pi, not even `import type` from Pi.
// Measured (r8 planning): the P-VIII scan flags ANY non-relative, non-`node:` specifier, type-only imports included
// (`external dependency "@earendil-works/pi-coding-agent"`), so importing Pi's types would either fail the scan or need an exemption in the
// guard that keeps KILN dependency-free. A structural port also makes the SEAM literal: this list is exactly what r9 must re-map, and it
// decouples KILN from a pre-1.0 Pi's type churn. Pi passes real objects; TypeScript's structural typing does the rest.
//
// Rules: (1) nothing outside `kiln/pi/` reads a Pi type; (2) anything not listed here KILN does not call; (3) `mode` may be ABSENT or a value
// KILN has never seen (a Pi newer than the one measured) — that is a VALID input, and it means CANNOT ASK.
//
// TYPES ONLY. The capability rule lives in `detectCapability` (T020) and the outcome rule in `outcome.ts` (T021) — each written test-first.

/** The four run modes Pi 0.85.1 reports on `ctx.mode` (measured: rpc, json, print; documented: tui). */
export type PiMode = "tui" | "rpc" | "json" | "print";

/** `select` options Pi accepts. KILN's gate dialogs NEVER pass one (FR-008); only the labelled `// SHAPE-TEST` self-test line may. */
export interface PiDialogOptions {
  timeout?: number;
}

/** The parts of `ctx.ui` KILN uses. `custom` is `undefined`-returning in `rpc` (measured, M5) — hence `T | undefined`. */
export interface PiUi {
  select(title: string, options: string[], opts?: PiDialogOptions): Promise<string | undefined>;
  notify(message: string, level?: "info" | "warning" | "error"): void;
  custom<T>(factory: (...args: unknown[]) => unknown, options?: { overlay?: boolean; overlayOptions?: unknown }): Promise<T | undefined>;
}

/** The parts of an extension `ctx` KILN reads. `mode` is a plain string: it may be a value this KILN has never seen. */
export interface PiCtx {
  mode?: string;
  hasUI: boolean;
  cwd: string;
  ui: PiUi;
}

export interface PiCommand {
  description?: string;
  handler(args: string, ctx: PiCtx): void | Promise<void>;
}

/** The parts of the `ExtensionAPI` KILN uses. r8 registers commands and NOTHING else — no events, tools, shortcuts, flags or providers. */
export interface PiApi {
  registerCommand(name: string, options: PiCommand): void;
}

// ── E2 — Capability ────────────────────────────────────────────────────────────────────────────────────
/** Derived, never stored. The truth table is contracts/pi-seam.md S2. */
export interface Capability {
  /** the mode as reported, or `"unknown"` */
  mode: PiMode | "unknown";
  /** this run can put a question to a human and receive an explicit choice */
  canAsk: boolean;
  /** this run can host `ctx.ui.custom` (an overlay) */
  canDraw: boolean;
  /** one line saying which rule decided it */
  why: string;
}

// ── E3 — GateQuestion ──────────────────────────────────────────────────────────────────────────────────
/**
 * A question a GATE asks. There is NO `timeout` field and NO `signal` field, so a gate dialog CANNOT carry one by construction (FR-008): a gate
 * waits for a human and does not expire into anything (P-IX). `options` is non-empty and its members are distinct.
 */
export interface GateQuestion {
  title: string;
  options: readonly string[];
}

// ── E4 — Outcome ───────────────────────────────────────────────────────────────────────────────────────
/**
 * Why there was no answer.
 *  - `cannot-ask`  the mode has no way to reach a human (json / print / unknown / !hasUI)
 *  - `dismissed`   `undefined`/`null` — cancelled, timed out, or closed
 *  - `not-offered` a string that is not one of the offered options
 *  - `wrong-type`  anything that is not a string (e.g. a boolean from `confirm`)
 */
export type NoAnswerReason = "cannot-ask" | "dismissed" | "not-offered" | "wrong-type";

/** There is NO third value — no "default", no "implicit yes". `no-answer` carries the reason so a log line and the self-test can say why. */
export type Outcome = { kind: "answered"; option: string } | { kind: "no-answer"; reason: NoAnswerReason };

// ── detectCapability (T020) ────────────────────────────────────────────────────────────────────────────
/**
 * S2's truth table, verbatim. A capability is granted ONLY by an AFFIRMATIVE row below; the default is "cannot ask, cannot draw" — a
 * fail-safe for a Pi mode this was never run on (`mode` may be a value KILN has never seen). Nothing is inferred from `hasUI` alone
 * (measured, M5): `rpc` reports `hasUI: true` and still cannot draw an overlay.
 */
export function detectCapability(ctx: Pick<PiCtx, "mode" | "hasUI">): Capability {
  if (ctx.mode === "tui" && ctx.hasUI) return { mode: "tui", canAsk: true, canDraw: true, why: "tui + hasUI: a real terminal can ask and draw" };
  if (ctx.mode === "rpc" && ctx.hasUI) return { mode: "rpc", canAsk: true, canDraw: false, why: "rpc + hasUI: can ask via the UI sub-protocol, but custom() resolves undefined (M5)" };
  if (ctx.mode === "json" && !ctx.hasUI) return { mode: "json", canAsk: false, canDraw: false, why: "json: no UI reaches a human (M6)" };
  if (ctx.mode === "print" && !ctx.hasUI) return { mode: "print", canAsk: false, canDraw: false, why: "print: no UI reaches a human (M6)" };
  return { mode: "unknown", canAsk: false, canDraw: false, why: `no affirmative S2 row matches mode=${String(ctx.mode)} hasUI=${ctx.hasUI} — fail-safe` };
}
