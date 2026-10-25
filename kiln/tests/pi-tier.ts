// Should the runner switch the live-Pi tier off for the legacy suite? (r12 T042; data-model §10, contracts/runner.md.)
// Pure decision + the one place that asks Pi its version. The legacy gate already honours KILN_PI=0 with a printed per-test reason, so the
// runner does not touch any legacy file: it sets that variable for the legacy child.
import { spawnSync } from "node:child_process";
import { basename } from "node:path";

export type PiTierDecision =
  | { action: "leave" } // demanded, absent, measured, or already switched off
  | { action: "switch-off"; installed: string; measured: readonly string[] };

export function decidePiTier(input: {
  env: Record<string, string | undefined>; // KILN_PI
  demanded: boolean; // --pi
  installedVersion: string | null; // from `<pi> --version`; null = no pi
  measured: readonly string[]; // MEASURED_PI_VERSIONS
}): PiTierDecision {
  if (input.demanded || input.env.KILN_PI === "1") return { action: "leave" }; // demanded: the tests run, and fail by name on an unmeasured Pi
  if (input.env.KILN_PI === "0") return { action: "leave" }; // already off
  if (input.installedVersion === null) return { action: "leave" }; // the legacy gate skips with its own reason
  if (input.measured.includes(input.installedVersion)) return { action: "leave" };
  return { action: "switch-off", installed: input.installedVersion, measured: input.measured };
}

/** The Pi binary: `KILN_PI_BIN` or `pi` (the first program's rule; only a binary named pi / pi.cmd is ever run). */
export function piBinary(env: Record<string, string | undefined>): string {
  return env.KILN_PI_BIN ?? "pi";
}

/** `<pi> --version`, trimmed (first line); null when Pi is absent, refused, or answers with a failure. Copied from legacy/validate/_pi-driver.ts `version`. */
export function installedPiVersion(bin: string): string | null {
  const name = basename(bin);
  if (name !== "pi" && name !== "pi.cmd") return null;
  const r = spawnSync(bin, ["--version"], { encoding: "utf8", timeout: 15_000 });
  if (r.error || r.status !== 0) return null;
  const first = r.stdout.split("\n").map((l) => l.trim()).find((l) => l !== "");
  return first ?? null;
}
