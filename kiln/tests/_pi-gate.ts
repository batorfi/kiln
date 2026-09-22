// kiln/tests/_pi-gate.ts — T002, r8 · research D8 · FR-011 (Pi tiering).
//
// The Pi tier runs REAL Pi, but hermetically: offline, no model, no session, a temp config dir (contract pi-ready R1). It costs ~0.2 s a round trip,
// so — unlike r7's opt-in live tier — it is NOT opt-in; making it opt-in would only let it rot. Instead:
//
//   KILN_PI unset  → AUTO    run when a `pi` binary is found; SKIP WITH A RECORDED REASON when it is not (a Pi-less CI stays green *and* visible)
//   KILN_PI=1      → DEMAND  the operator asked for the tier: the gate NEVER skips, and an absent Pi is a FAILURE the test body raises via
//                            `demandFailure()` (the F-1 rule — a quiet skip there could make a broken setup look green). An UNMEASURED Pi fails
//                            through PiReady's `pi-version-unmeasured`.
//   KILN_PI=0      → OFF     skip explicitly, with a printed reason
//
// Anything else in KILN_PI (`true`, `yes`, ``) is AUTO — never a silent demand. A skipped test is NEVER a silent pass: `skipUnlessPi()` returns a
// node-test `{ skip: <reason> }`, so the reason is printed in the report itself (P-V lifted to the suite).
//
// Lives under `tests/`, which the P-VIII scan does not police — so `spawnSync` here is fine. The one scanned module that spawns `pi` is
// `validate/_pi-driver.ts` (PROCESS_ALLOWLIST). Not a `*.test.ts`, so the suite glob does not treat it as a suite of its own.
import { spawnSync } from "node:child_process";

export const PI_ENV = "KILN_PI";
export const PI_BIN_ENV = "KILN_PI_BIN";
export type PiTier = "auto" | "demand" | "off";
export type Env = Record<string, string | undefined>;

/** How the Pi tier was requested. Only an EXPLICIT `1` demands it; only an explicit `0` turns it off. */
export function piMode(env: Env = process.env): PiTier {
  if (env[PI_ENV] === "1") return "demand";
  if (env[PI_ENV] === "0") return "off";
  return "auto";
}

/** The `pi` to look for: `KILN_PI_BIN` may name a *different path* to a `pi` (the driver refuses any other program); default the bare name. */
export function piBinary(env: Env = process.env): string {
  const b = env[PI_BIN_ENV];
  return b !== undefined && b !== "" ? b : "pi";
}

/** True iff `<pi> --version` runs and exits 0. Synchronous — a gate decision must not need an event loop. */
export function piAvailable(env: Env = process.env): boolean {
  const r = spawnSync(piBinary(env), ["--version"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 15_000 });
  return !r.error && r.status === 0;
}

/** The recorded reason a Pi test is skipped when Pi is absent (surfaced in the node-test report). */
export function piAbsentReason(): string {
  return `Pi tier skipped: no \`pi\` binary found (${PI_BIN_ENV} to point at one) — install Pi, or set ${PI_ENV}=1 to DEMAND the tier and fail instead of skipping`;
}

/** The recorded reason when the operator switched the tier off. */
export const PI_OFF_REASON = `Pi tier switched off: ${PI_ENV}=0`;

export interface GateOpts { env?: Env; available?: () => boolean }

/** Spread into a node-test options object: `test("PI-LIVE: …", skipUnlessPi(), async () => {…})`. */
export function skipUnlessPi(o: GateOpts = {}): { skip: string | false } {
  const env = o.env ?? process.env;
  const mode = piMode(env);
  if (mode === "off") return { skip: PI_OFF_REASON };
  if (mode === "demand") return { skip: false }; // demanded: never skip; the body raises `demandFailure()` if Pi is absent
  return { skip: (o.available ?? (() => piAvailable(env)))() ? false : piAbsentReason() };
}

/** In DEMAND mode with no Pi: the message a test body must fail with. `null` in every other case. */
export function demandFailure(o: GateOpts = {}): string | null {
  const env = o.env ?? process.env;
  if (piMode(env) !== "demand") return null;
  return (o.available ?? (() => piAvailable(env)))() ? null : `${PI_ENV}=1 demands the Pi tier, but no \`pi\` binary was found — refusing to skip (F-1). Install Pi, or unset ${PI_ENV}.`;
}
