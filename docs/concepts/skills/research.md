> Status: ground-up concept
> Type: skill — Researcher (implementation-context brief / `context.md`)
> Companion docs: `20260911-concept.md` (vision), `20260911-process-flow.md`
>
> Grounding: the "skill" framing follows `pipeline-template`'s `researcher/SKILL.md`; the
> KILN-specific deltas (the single-lane placement, a local-model caveat, and the fact that there
> is no research gate) are ground-up KILN ideas. `context.md` is the artifact's real content.

# KILN — Researcher (the first pass): a brief the whole factory warms up on

## 0. KILN vs pipeline framing

The **researcher** is the *first* thing that runs on a feature: a **short, dedicated lane hold
before the concept**. Its whole job is to hand the concept writer a **warm start** instead of the
cold raw idea — so that design (concept, architecture) is *informed* from the opening move, not
guessed. The researcher **gathers context only**: it does not decide the problem, not propose a
solution, not write the concept.

In `pipeline-template` the researcher is a real skill producing **`context.md`** — a structured
implementation-context brief. KILN keeps the artifact and the discipline; the only changes are
*placement* (it is the first unit on the lane) and a *local-model caveat* (web research on a
local setup depends on connectivity and tooling).

## 1. Purpose

Run the **implementation-context pass** — assemble the **`context.md`** brief that the concept
writer (and, later, the architecture designer) will read **in full** before starting.

The brief has **five sections**, all grounded:

1. **Restated problem, in the researcher's own words** — a one-paragraph summary of what the raw
   input actually asks for, **surfacing — but not resolving — any ambiguity in the phrasing**.
2. **Relevant prior art from this project** — earlier concepts (`concepts/`, `drafts/concepts/`),
   ADRs, overlapping specs, reference materials, zettelkasten notes — **cited by path/ID, not
   gestured at**.
3. **External research**, *only for what the project's own history doesn't cover* — patterns,
   outside prior art, known pitfalls. **Proportionate:** a well-covered internal topic needs
   little to none; a genuinely novel one needs more.
4. **Known constraints** — anything from the constitution, prior ADRs, or the raw input that
   already narrows the solution space (a named sensitive surface, an existing commitment, a stated
   non-goal).
5. **Open questions** — things found but not resolvable here, worth the concept writer's or a
   human's attention. **This list is expected to be non-empty; empty is the odd result.**

## 2. Inputs

- **The raw input the human handed the director at kickoff** — a doc, a ticket, a transcript, or a
  few sentences.
- **This project's own prior artifacts** — the prior research above (concepts, ADRs, specs,
  references, notes).
- **Web search / fetch** — *only when the project's own history doesn't already cover the ground*.

## 3. Output

- **`context.md`** at the location the director expects, structured under the five headings above
  and **concise enough that the concept writer reads it in full, not skimming past it**.

## 4. What must NOT happen (this discards the "just grep and summarize" reading)

The researcher is **context-gathering, not deciding**:

- **Do not propose a solution, an architecture, or a scope** — that is the concept writer's and
  the architecture designer's job, upstream of gates the researcher doesn't control.
- **Do not treat "found nothing relevant" as a failure to hide** — if the project history and a
  reasonable external search turn up nothing useful on a sub-topic, **say so plainly**, don't pad
  the brief with tangential material to look thorough.
- **Do not fetch or summarize anything outside what's relevant to *this* feature** — this is
  **not a general survey** of the problem space; it's a focused brief scoped to one feature.
- **Do not present to the human** — the researcher reports *ready* to the **director**, who
  presents at the Concept gate.

The brief's integrity is its value: a *honest, scoped, sourced* brief. Padding it with
irrelevant material, or burying "I found nothing," both make the downstream design worse.

## 5. Model tiering (KILN)

The researcher is a **work pass, cheap-to-standard head**. It is **short** — a brief, not a
deep pass. One nuance for a **local** setup: the **project-history part §3.2** (prior art,
constraints) is trivially local and cheap; the **external-research part §3.3** depends on web
access and tooling that a fully offline lane may not have. So on a local substrate the researcher
**leans on the project's own history first** and treats external research as a *fallback, flagged
as "unavailable" when it is*, rather than blocking. This is the one place the local constraint
touches the research step; everything else is local.

## 6. Gate / role

- **No dedicated gate** — the researcher **feeds the Concept gate** (the brief *is* an input to it).
- In `pipeline-template` this runs **only for standard-triage** features; **small-triage features
  skip it** along with the Concept gate (a small feature doesn't need a brief).
- Placement: the **first unit** on the lane, before Concept — and a short one, so it doesn't add
  a meaningful hold.

## 7. Grounding

`pipeline-template/skills/researcher/SKILL.md` — *"You are an ephemeral pane spawned once, at the
very start of a feature, before the concept writer. Your only job is to produce `context.md`: a
structured brief … You do not write the concept, propose an architecture, or evaluate anything — you
gather what's relevant so the roles that do those things aren't starting cold."* Inputs: the raw
kickoff input, the project's own prior artifacts, and web search *when the project's history
doesn't cover it*. `context.md` has **five sections** (restate problem, prior art, external
research, known constraints, open questions). Must-NOTs: no solution/architecture/scope, no hiding
"found nothing," not a general survey. Output: `context.md` reported ready to the director, who
presents at the concept gate. KILN deltas (§5 local-model caveat, §6 first-pass placement /
small-triage skip) are ground-up.

*The researcher is the warm-up: short, local-first, and it hands the whole factory a brief instead
of a cold start.*
