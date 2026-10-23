// kiln/tests/pi/_seam-rows.ts — T017, r8 · contracts/pi-seam.md S3.1 · shared by seam.test.ts and its mutation harness.
// The S3.1 truth table AS DATA: N1-N9 must all yield no-answer (with the contract's reason); Y1 is the ONLY row that yields an answer.
// Not a *.test.ts file — the glob does not pick it up as a suite of its own.
import type { Capability, Outcome } from "../../pi/port.ts";

export interface SeamRow {
  name: string;
  raw: unknown;
  options: readonly string[];
  capability: Capability;
  expect: Outcome;
}

const ask = (mode: Capability["mode"], canAsk: boolean, canDraw = false): Capability => ({ mode, canAsk, canDraw, why: "test fixture" });
const OPTIONS = ["approve", "reject", "defer"] as const;

export const SEAM_ROWS: SeamRow[] = [
  { name: "N1-tui-cancelled", raw: undefined, options: OPTIONS, capability: ask("tui", true, true), expect: { kind: "no-answer", reason: "dismissed" } },
  { name: "N1-rpc-cancelled", raw: undefined, options: OPTIONS, capability: ask("rpc", true, false), expect: { kind: "no-answer", reason: "dismissed" } },
  { name: "N2-rpc-timeout", raw: undefined, options: OPTIONS, capability: ask("rpc", true, false), expect: { kind: "no-answer", reason: "dismissed" } },
  { name: "N3-print-headless", raw: undefined, options: OPTIONS, capability: ask("print", false, false), expect: { kind: "no-answer", reason: "cannot-ask" } },
  { name: "N4-json-headless", raw: undefined, options: OPTIONS, capability: ask("json", false, false), expect: { kind: "no-answer", reason: "cannot-ask" } },
  { name: "N5-confirm-false-print", raw: false, options: OPTIONS, capability: ask("print", false, false), expect: { kind: "no-answer", reason: "cannot-ask" } },
  { name: "N5-confirm-false-json", raw: false, options: OPTIONS, capability: ask("json", false, false), expect: { kind: "no-answer", reason: "cannot-ask" } },
  // N6: custom() -> undefined in rpc; canDraw is false, so the layer is HIDDEN — modelled here as the same seam fed `undefined` under rpc capability.
  { name: "N6-custom-undefined-rpc", raw: undefined, options: OPTIONS, capability: ask("rpc", true, false), expect: { kind: "no-answer", reason: "dismissed" } },
  { name: "N7-hasUI-false-mode-absent", raw: "approve", options: OPTIONS, capability: ask("unknown", false, false), expect: { kind: "no-answer", reason: "cannot-ask" } },
  { name: "N8-not-offered", raw: "maybe", options: OPTIONS, capability: ask("tui", true, true), expect: { kind: "no-answer", reason: "not-offered" } },
  { name: "N9-unknown-future-mode", raw: "approve", options: OPTIONS, capability: ask("unknown", false, false), expect: { kind: "no-answer", reason: "cannot-ask" } },
  { name: "Y1-answered", raw: "approve", options: OPTIONS, capability: ask("tui", true, true), expect: { kind: "answered", option: "approve" } },
  { name: "Y1-answered-rpc", raw: "approve", options: OPTIONS, capability: ask("rpc", true, false), expect: { kind: "answered", option: "approve" } },
  // extra: wrong-type (a boolean, e.g. confirm's true, mistakenly fed to interpret) while capability CAN ask — must still be a non-answer.
  { name: "N10-wrong-type-boolean", raw: true, options: OPTIONS, capability: ask("tui", true, true), expect: { kind: "no-answer", reason: "wrong-type" } },
];

/** Run every row through `interpret`; return the NAMES of the rows whose actual outcome does not match `expect`. The real seam returns []. */
export function checkInterpret(interpret: (raw: unknown, options: readonly string[], capability: Capability) => Outcome): string[] {
  const failed: string[] = [];
  for (const row of SEAM_ROWS) {
    const got = interpret(row.raw, row.options, row.capability);
    const same = got.kind === row.expect.kind && (got.kind === "answered" ? (got as any).option === (row.expect as any).option : (got as any).reason === (row.expect as any).reason);
    if (!same) failed.push(row.name);
  }
  return failed;
}
