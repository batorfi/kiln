// kiln/src/stub-resident.ts — T003 (Foundational, E6 / US6 driver input)
//
// The "resident model" as an INTERFACE a test drives the lane with — NO live Ollama, NO network
// (research D4 / NC2; P-VIII local-first). It is a DETERMINISTIC test double whose outputs are
// fixed per input, so a walk it produces is REPRODUCIBLE and REPLAYABLE through 001's
// `kiln/validate/log.ts` (the dogfood, D5). It is NEVER the decider of a gate (P-I/VI: a human
// is). A genuine live-model smoke walk is r3 — not provided here.
//
// A `WorkUnit` is the thing the lane/scheduler move through the single lane; it carries the role
// (001's `Role`) and the required model `tier` (P-II/IV affinity). These are r1's own runtime
// types (001's shapes — `Role`, `Tier`, `Cost`, `FactoryState` — are imported from `roles.ts` /
// `types.ts`, NOT re-declared).

import type { Role, Tier } from "./roles.ts";

/** One unit of work the director moves through the single lane (E1's `running` slot). */
export interface WorkUnit {
  id: string;
  role: Role; // from kiln/src/roles.ts
  tier: Tier; // the unit's required tier (P-II/IV)
  work?: unknown; // input the stub consumes
  out?: unknown; // a fixed, deterministic output the stub returns
}

/**
 * The resident-model interface the lane drives. It runs a unit and reports which model/tier it
 * holds — but it NEVER decides a gate. Determinism (fixed output per input) is what makes the
 * emitted log replayable (D5) and the "at any instant" invariants reproducible (SC-001).
 */
export interface Resident {
  // r7 (NC1=B, D1/A1): WIDENED by UNION — a resident may now be async (a real model call). r1's stub and
  // r3's adapter still return plain values and stay conforming and UNEDITED: `await` on a non-Promise is
  // a pass-through, so the change lands in the CALLERS. (No `tsc` runs in this zero-dep repo — node strips
  // types — so this union is a CONTRACT, not something the toolchain enforces; T012 guards the runtime.)
  run(workUnit: WorkUnit): unknown | Promise<unknown>;
  model(): string;
  tier(): Tier;
}

export interface StubResidentOptions {
  model?: string;
  tier?: Tier;
}

/**
 * Build a deterministic resident that "runs" a unit by returning `unit.out ?? unit.work` and
 * reports a fixed model/tier. No I/O, no clock, no network — the same input yields the same
 * output every run (NC2: a stand-in for a local model, not the live-model walk of r3).
 */
export function makeStubResident(opts: StubResidentOptions = {}): Resident {
  const model = opts.model ?? "stub-resident";
  const tier = opts.tier ?? "strongest";
  return {
    run(workUnit: WorkUnit): unknown {
      // Deterministic: fixed output per unit (its declared `out`, else pass the input through).
      return workUnit.out ?? workUnit.work;
    },
    model(): string {
      return model;
    },
    tier(): Tier {
      return tier;
    },
  };
}
