// kiln/pi/outcome.ts — T021, r8 · FR-006, FR-007, FR-008, FR-009, FR-017 · contracts/pi-seam.md S3–S5.
//
// The ONE seam between Pi's dialogs and KILN. Its whole job: turn whatever Pi returns into `answered(option)` or `no-answer`, and hand every
// `no-answer` to r1's OWN `headlessWait` — never invent a second Wait mechanism, never move a gate along any of r1's other resolution paths, never
// touch the factory-log. An `answered` outcome is returned UNAPPLIED: it is not a human decision until a LATER row applies it with a human's
// identity, so a scripted test driver's reply is structurally unable to become `human@…` here (FR-009).
//
// Imports ONLY port.ts (KILN's own structural Pi types) and r1's real gate.ts — nothing wider, so there is no surface to smuggle a decision
// through (a static test checks this).
import type { Capability, GateQuestion, NoAnswerReason, Outcome, PiCtx } from "./port.ts";
import { headlessWait, type Gate, type Wait } from "../src/gate.ts";
import { detectCapability } from "./port.ts";

/**
 * S3, in EXACT order. `cannot-ask` is checked FIRST, so a headless mode that returns a string by some future accident still cannot produce
 * an answer (a fail-safe, not just a happy-path check). There is NO third value — no "default", no "implicit yes" (data-model E4).
 */
export function interpret(raw: unknown, options: readonly string[], capability: Pick<Capability, "canAsk">): Outcome {
  if (!capability.canAsk) return noAnswer("cannot-ask");
  if (raw === undefined || raw === null) return noAnswer("dismissed");
  if (typeof raw !== "string") return noAnswer("wrong-type");
  if (!options.includes(raw)) return noAnswer("not-offered");
  return { kind: "answered", option: raw };
}

function noAnswer(reason: NoAnswerReason): Outcome {
  return { kind: "no-answer", reason };
}

/**
 * S4: build the ONE call a gate question ever makes — `ctx.ui.select(title, options)`, EXACTLY two arguments. `GateQuestion` (port.ts) has no
 * `timeout`/`signal` field, so there is nothing here to forward even by mistake (FR-008). Returns the raw Pi value; `interpret` decides its meaning.
 */
export async function askGate(ctx: Pick<PiCtx, "ui">, question: GateQuestion): Promise<unknown> {
  return ctx.ui.select(question.title, [...question.options]);
}

export type AskResult = { kind: "answered"; option: string } | { kind: "wait"; wait: Wait };

/**
 * S5: ask, interpret, and resolve. `no-answer` -> r1's REAL `headlessWait(gate)` (never resolved here — resumption is by token, elsewhere,
 * later, by a human). `answered` -> the option, UNAPPLIED: this function never writes `gate.move`, never sets `gate.decidedBy`.
 */
export async function resolveAsk(ctx: PiCtx, gate: Gate, question: GateQuestion): Promise<AskResult> {
  const capability = detectCapability(ctx);
  const raw = capability.canAsk ? await askGate(ctx, question) : undefined; // never call select() when it cannot reach a human (S2)
  const outcome = interpret(raw, question.options, capability);
  if (outcome.kind === "answered") return { kind: "answered", option: outcome.option };
  return { kind: "wait", wait: headlessWait(gate) };
}
