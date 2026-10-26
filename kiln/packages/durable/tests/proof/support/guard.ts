// The never-vacuous guard of the proof (FR-061): a proof that exercised nothing proves nothing. Every kill-point scenario reports which declared points FIRED; the guard fails by name when the
// declared list is empty, when nothing fired, or when a declared point did not.
export class ProofVacuous extends Error {
  readonly code: "proof-zero-kill-points" | "proof-no-point-fired" | "proof-point-not-fired";
  constructor(code: ProofVacuous["code"], message: string) {
    super(`${code}: ${message}`);
    this.name = "ProofVacuous";
    this.code = code;
  }
}

export function assertAllFired(declared: readonly string[], fired: readonly string[]): { exercised: number; of: number } {
  if (declared.length === 0) throw new ProofVacuous("proof-zero-kill-points", "the declared list of kill points is empty: a proof with nothing to kill at proves nothing");
  const f = new Set(fired);
  if (!declared.some((d) => f.has(d))) throw new ProofVacuous("proof-no-point-fired", `${declared.length} kill points were declared and none fired`);
  const missing = declared.filter((d) => !f.has(d));
  if (missing.length > 0) throw new ProofVacuous("proof-point-not-fired", `declared but never fired: ${missing.join(", ")}`);
  return { exercised: declared.length, of: declared.length };
}
