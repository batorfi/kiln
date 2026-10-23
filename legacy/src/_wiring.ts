// kiln/src/_wiring.ts — T031 (US6): the wired-vs-not marker r1's RuntimeReady check (a) reads.
//
// 001 shipped `laneIsWired() === false` (WIRING_STATUS = "not-wired …"). r1 FLIPS it: the spine
// (lane / gate / writer / scheduler / ui / stub-resident) is now importable through `kiln/index.ts`,
// so `laneIsWired()` is true. Nothing here admits a program or advances Gate 0 (P-VI / FR-012); it
// only reports that the runtime EXISTS and is wired.

export const WIRING_STATUS = "wired (r1 lane runtime; gate0 admission lives in specs/ROADMAP.md, human@)" as const;
export function laneIsWired(): boolean {
  return true;
}
