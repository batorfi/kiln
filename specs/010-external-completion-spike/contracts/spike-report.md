# Contract: the spike report

**Spec**: FR-001, FR-002, FR-008, FR-009, FR-012, SC-001, SC-007, SC-009 · **Location when written**: `specs/010-external-completion-spike/spike-report.md`

The report is the product of the row. It states a verdict; it never records a gate decision and never edits the roadmap (constitution VI) — a person does both at the Roadmap gate.

## 1. Required sections, in this order

| # | Section | Must contain |
|---|---|---|
| 1 | **Verdict** | exactly one of `go` · `go-with-fallback` · `no-go`; the sentence a person reads first; the pinned version (`@earendil-works/pi-durable` 1.4.0 + integrity); the time box (start, end, whether it was kept) |
| 2 | **The five guarantees** | for each of a–e and for **each strategy tried**: `held` · `not-held` · `not-proven`, the scenario counts, and a pointer to the evidence (file and test name) |
| 3 | **What was tried** | each strategy, in order, why it was tried, and exactly where it failed or held — no strategy omitted because it failed |
| 4 | **Kill points** | the enumerated list per strategy, how many were exercised, and the randomised-kill counts (labelled supporting evidence) |
| 5 | **The contract for r13** | the port ([gate-completion-port.md](./gate-completion-port.md)) as it stands after the spike, in KILN's terms only; which guarantees depend on the fallback; what replaces it if upstream lands; **which source is authoritative if a fallback and a native path ever disagree, and why** |
| 6 | **Findings for r13** | at least: the Node floor (`engines >=22.19.0` against `kiln/`'s `^22.18.0`), the transitive dependency tree, the **experimental `node:sqlite`** the storage rests on (a warning on Node 22.19.0), the restart-limit setting (`Infinity`), the one-owner-per-storage rule, power-loss boundary, anything the spike found that the PRD/roadmap should hear |
| 7 | **Upstream proposal** | present iff the verdict is `go-with-fallback`; attached, marked *not filed* |
| 8 | **Fate of the code** | what (if anything) becomes product code and in which row; what is discarded; default: nothing |
| 9 | **Reproduce** | the one command, its expected output, and the platform it was run on |
| 10 | **Unproven** | every scenario not run or not finished, and the effect on the verdict (empty only if nothing is unproven) |

## 2. Statuses

A guarantee is **held** for a strategy only if every scenario that targets it **ran** (count > 0) and passed. It is **not-held** if any scenario ran and violated an invariant. It is **not-proven** if any scenario did not run, the
strategy declared zero kill points, or the time box ended first. *An unproven guarantee is never reported as held, and a verdict is never more favourable than its weakest claimed guarantee.*

## 3. Verdict rules

| Verdict | When |
|---|---|
| **go** | one **native** strategy holds all five guarantees (a–e), including with a completer in a different process |
| **go-with-fallback** | no native strategy holds all five, **and** a fallback strategy holds all five under the same tests; the proposal is attached; r13 may start on the fallback |
| **no-go** | no strategy holds all five, or a guarantee needed by CORE-3 is `not-proven` for every strategy when the time box ends. The report states what re-planning the Roadmap gate must consider **before r13** |

A **caveat** is declared by the strategy (`Strategy.caveats`) as `{text, enforceable}`; `enforceable` means r13 can guarantee the condition structurally (for example a setting the seam always sets). If a native strategy holds a–e *with a stated caveat* (for example "d holds only because `restartLimit` is `Infinity`"), the caveat is part of the verdict sentence, and the verdict stays `go` only when the caveat is something r13 can
enforce structurally. Otherwise it is `go-with-fallback`.

## 4. After the report

Nothing in the repository acts on the verdict. The roadmap's `r42` row is closed — `done`, `@PR#N` — by the Roadmap gate, and a `no-go` re-opens that gate **before r13** (roadmap decision of 2026-10-21).
