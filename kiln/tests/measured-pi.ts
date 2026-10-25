// The Pi versions the live-Pi tier was MEASURED against — the single constant of the new runner (r12 T042; contracts/runner.md).
// tests/runner/measured-equality.test.ts asserts it equals the first program's own list (legacy/validate/_pi-driver.ts) by reading that
// file's text. When a later chore re-measures a newer Pi, both lists change in one commit.
export const MEASURED_PI_VERSIONS: readonly string[] = ["0.85.1"];
