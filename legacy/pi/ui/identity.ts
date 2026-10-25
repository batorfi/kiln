// kiln/pi/ui/identity.ts — T008 (Foundational), r9 · FR-004 · data-model E3 · research D4 · NC1 = A.
//
// `decidedBy` (NC1): an EXPLICIT, required, session-level identity — `KILN_HUMAN`, read once, refused with a named reason if
// absent or malformed. PURE given an env object (defaults to `process.env`): no I/O beyond reading the one variable, no
// caching. The accepted shape is data-model E3's own declared regex, `/^human@\S+$/` — a STRICTER member of the SAME
// `human@…`-prefixed family `applyMove`/`recordGate0Decision`/`resumeByToken` already require (measured: those three only
// check `decidedBy.startsWith("human@")`, so e.g. the bare string `"human@"` passes THEIR check but not this one — see
// `tests/pi/ui/identity.test.ts`'s own cross-check, which documents the difference rather than assuming equivalence).
// Anything this function accepts, they also accept; the reverse is not always true — there is still no second, LOOSER
// notion of "a human" anywhere in r9's own resolution.
export type IdentityResult = { ok: true; decidedBy: string } | { ok: false; reason: string };

const HUMAN_RE = /^human@\S+$/;

export function resolveIdentity(env: Record<string, string | undefined> = process.env): IdentityResult {
  const value = env.KILN_HUMAN;
  if (value === undefined || value === "") {
    return { ok: false, reason: "KILN_HUMAN is not set — a human decision needs an explicit identity (e.g. KILN_HUMAN=human@yourname)" };
  }
  if (!HUMAN_RE.test(value)) {
    return { ok: false, reason: `KILN_HUMAN="${value}" is not a valid identity — it must match /^human@\\S+$/ (e.g. human@yourname)` };
  }
  return { ok: true, decidedBy: value };
}
