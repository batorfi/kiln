> Status: ground-up concept
> Type: concept — the Concept Writer (a *kind* of "writer," not one of a single canonical role)
> Companion docs: `../concept.md` (vision), `../gates-why-how-what.md`
>
> Grounding: in `pipeline-template` there is **no separate "writer" role** — writing is what the
> *concept-writer*, *techwriter*, and *pr-writer* do, in their own contexts. This doc is therefore
> a *kinding* of "writer" in KILN, not a 1:1 of a `pipeline-template` skill. Each of the three
> writers is grounded on its real `pipeline-template` SKILL.md (cited per §3 below); the KILN deltas
> (tiering under the single lane, lane placement, the gate behind each) are ground-up.

# KILN — "Writer": three writers, one lane, three gates behind them

## 0. KILN vs pipeline framing

This doc's title says "Writer" (singular), but that's the human's habit, not KILN's shape. In
`pipeline-template` there is **no single writer role** — the writing happens at **three** distinct
moments, by **three** distinct roles:

- **Concept Writer** — writes the **concept** (a short, human-readable description of *what* the
  feature is and *why*). This is the artifact the Architecture gate consumes.
- **Techwriter** — writes the **per-feature docs/usage** after the feature is verified, *before*
  the PR gate. This is the *how-to* for a human or a future agent: "use this."
- **PR Writer** — writes the **PR description** *after* the docs gate (and per `pipeline-template`'s
  real ordering, after *verification* — "after docs, before push"). This is the artifact the
  human merges on.

So "a writer" in KILN is a **kind**, a *role family*, not a single skill. The single-lane KILN shape
matters here because these three writers run at **very different points on the lane**, and the
cost/quality trade-off is **different for each** — each is bounded by the gate *behind* it, but the
gates are different gates.

## 1. What a writer does (shared)

Each writer produces a **specific artifact** that its gate consumes, and each may use a **cheaper
model** *because a gate sits behind the work*. The shared discipline is: **the work is bounded by
the gate, not by the model's confidence** — so a weaker model is acceptable here, exactly as it is
for any work role, *because* the human decides the gate.

## 2. Inputs (all three)

The approved output of the **gate immediately upstream**, plus the feature's spec/stories/concept:
- **Concept Writer** reads `context.md` in full (from the researcher) *and* the raw human input.
- **Techwriter** reads the **verified** feature + its specs + concept (and ADRs).
- **PR Writer** reads the **docs** that the techwriter just wrote (and the verified code, the
  concept, the ADRs).

## 3. Output (the three artifacts, grounded per skill)

| Writer | Gate | Artifact | `pipeline-template` skill (grounding) |
|---|---|---|---|
| **Concept Writer** | **Concept** | `concept.md` — *what* + *why*, a few paragraphs human reads in full | `concept-writer/SKILL.md` — "ephemeral pane before the architecture gate; produce `concept.md`, read `context.md` in full; no solution proposals, no scope creep beyond the raw input." |
| **Techwriter** | **Docs** | per-feature **docs/usage** — how a human *uses* the feature | `techwriter/SKILL.md` — "ephemeral pane after verification, before PR gate; produce docs/usage; read the verified code + specs + concept; may skip docs for a small-triage feature; no editorializing beyond what's needed to use it." |
| **PR Writer** | **PR** | **PR description** — the change, the why, the verification summary | `pr-writer/SKILL.md` — "ephemeral pane **after docs, before push**; produce a PR description; reads the docs the techwriter just wrote; no extra explanation beyond what the doc + diff say; the gate is the human's merge decision." |

## 4. What must NOT happen

The shared discipline the three must all honor:

- **Write the artifact the gate expects**, not a *better* one. A concept writer who sneaks in
   "and while we're at it, also do X" has scope-crept past the raw input.
- **Don't editorialize** — a docs/PR writer adds "note that this is better than the old way!" —
   the doc is *how-to*, the diff is *what-changed*; opinion belongs in the gate review, not the
   artifact.
- **Don't skip the artifact for a non-small feature** — `small-triage` features *may* skip the
   **Docs** gate (and the techwriter pass); **standard** features don't.
- **Don't make the writing *be* the gate** — the writer *produces*; the **human** *decides*. A
   writer that says "I made the doc perfect" has moved the gate.

## 5. Model tiering & lane placement (KILN)

This is where the three differ, and where the single-lane ordering pays off:

- **Concept Writer** — a **standard** head (concept is *bounded by the Concept gate*, and the
   **Architecture gate** behind it means the concept *must* be good enough to design against — so
   it runs at **standard**, not cheap). It runs **early** on the lane, **after the researcher**, and
   is a natural **affinity neighbor** of the researcher (both standard-tier → no swap between them,
   the director keeps the lane resident).
- **Techwriter** — a **cheap** head. A **Docs** gate sits behind it (cheap work, gated). It runs
   **after the Verification gate** — late on the lane — and is a natural neighbor of the verifier's
   **strongest** pass only in *tier*, not *order*; the lane has likely **already swapped down** from
   the strongest by the time the docs come, so the docs pass is a **cheap neighbor** on a *cheap*
   resident. Good for the affinity queue: a cheap writer + the PR writer (also cheap) make **two
   cheap neighbors**, a no-swap pair.
- **PR Writer** — a **cheap** head, runs **last** (after the Docs gate, before the human's merge).
   It and the techwriter are the **final no-swap pair**, the cheap tail of the lane — which is
   exactly the cost-minimizing shape: the expensive strongest-tier passes (critic, verifier,
   reviewer) come *early-to-mid*, and the cheap tail (docs, PR) rides the resident cheap model off
   the end. **The lane's cost curve is U-shaped in quality, not in cost.**

## 6. Gate / role

Each writer's **own gate** is named in §3's table. All three are **work** roles (bounded *behind*
a gate), so all three are acceptable on a cheaper head on a local setup — but the *Concept* writer
is the **one work writer that runs at standard**, not cheap, because its gate is *immediately* the
architecture gate, not a back-gate. That single exception matters: it means the **first** writer on
the lane is *not* cheap, and the lane's early part is **standard-tier**, not cheap.

## 7. Grounding summary

The three writers are grounded per-skill (concept-writer, techwriter, pr-writer SKILL.md), and
`pipeline-template` orders them **after** their respective upstreams (concept after researcher,
docs after verification, PR after docs). KILN deltas: (§5) the single-lane **cost curve** (cheap
tail, no-swap neighbors, U-shaped in quality) is ground-up; (§6) the **concept-writer-at-standard**
exception (because its gate is immediately the architecture gate, not a back-gate) is a KILN
sharpening — `pipeline-template` doesn't say "cheap or standard," it just says "a writer."

*Three writers, not one: each at a different lane position, each bounded by a different gate behind
it. A writer's job is to hand its gate a clean artifact; the lane's job is to run them in the order
that keeps the resident model the same the longest.*
