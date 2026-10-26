// T024 — the verdict rules (contracts/spike-report.md §3), mechanical. The report STATES the result of this function; a person records it at the Roadmap gate.
//   go                a native strategy holds a–e and EVERY caveat it declares is enforceable
//   go-with-fallback  no native strategy qualifies, but a fallback holds a–e under the same scenarios
//   no-go             nothing holds all five (including: a needed guarantee is not-proven everywhere)
// Never more favourable than the weakest claimed guarantee: a single `not-proven` is enough to withhold a go. Test-only controls never count.
import { GUARANTEES, type Evidence, type StrategyEvidence, type Verdict } from "./evidence-model.ts";

export interface VerdictResult {
  verdict: Verdict;
  because: string[];
}

const holdsAll = (s: StrategyEvidence): boolean => GUARANTEES.every((g) => s.guarantees[g].status === "held");

function gaps(s: StrategyEvidence): string {
  const bad = GUARANTEES.filter((g) => s.guarantees[g].status !== "held").map((g) => `${g}: ${s.guarantees[g].status}${s.guarantees[g].violated.length ? ` (${s.guarantees[g].violated.join(", ")})` : ""}`);
  return bad.length ? bad.join("; ") : "holds a–e";
}

export function deriveVerdict(evidence: Evidence): VerdictResult {
  const candidates = Object.values(evidence.strategies).filter((s) => !s.testOnly);
  const natives = candidates.filter((s) => s.native);
  const fallbacks = candidates.filter((s) => !s.native);

  const qualifying = natives.find((s) => holdsAll(s) && s.caveats.every((c) => c.enforceable));
  if (qualifying) {
    const because = [`${qualifying.name} (native) holds guarantees a–e`];
    for (const c of qualifying.caveats) because.push(`caveat, enforceable by the seam: ${c.text}`);
    return { verdict: "go", because };
  }

  // why no native strategy qualifies — quoted in the report whatever comes next
  const why = natives.map((s) => {
    if (!holdsAll(s)) return `${s.name} (native) does not qualify — ${gaps(s)}`;
    const bad = s.caveats.filter((c) => !c.enforceable).map((c) => c.text);
    return `${s.name} (native) holds a–e but with a caveat r13 cannot enforce structurally: ${bad.join("; ")}`;
  });

  const holdingFallback = fallbacks.find(holdsAll);
  if (holdingFallback) {
    return { verdict: "go-with-fallback", because: [...(why.length ? why : ["no native strategy was run"]), `${holdingFallback.name} (fallback) holds guarantees a–e under the same scenarios`] };
  }

  const because = [...why, ...fallbacks.map((s) => `${s.name} (fallback) does not qualify — ${gaps(s)}`)];
  if (because.length === 0) because.push("no candidate strategy was run: nothing is proven");
  return { verdict: "no-go", because };
}
