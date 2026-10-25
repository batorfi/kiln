# Research: Foundations reset (row r12)

**Branch**: `009-kiln-foundations-reset` | **Date**: 2026-10-23 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Phase 0 of `/speckit-plan`. The spec has no `[NEEDS CLARIFICATION]` left; this document resolves the **design unknowns the spec
deliberately left to the plan** (layout, wiring, test placement, the byte-identity baseline, the `kiln` entry point, where the flow
version lives) and records the **measurements** each decision rests on. Everything measured was measured on 2026-10-23 on this
machine (macOS, Node 25.9.0, Pi 1.1.0, `main` at `299b0a5` plus the spec commits).

Each entry: **Decision** · **Rationale** · **Alternatives considered**.

---

## R1 — Where `legacy/` lives

**Decision.** `legacy/` is a directory **at the repository root**, created by `git mv kiln legacy` — the whole first-program tree
at the same depth the old `kiln/` had. The new code is a freshly created `kiln/` beside it.

**Measured.** Two scratch worktrees of the same commit, the legacy suite run unmodified in each (live-Pi tier off):

| Layout | Tests | Pass | Fail | Skipped | Notes |
|---|---|---|---|---|---|
| **A — `legacy/` at the repo root** (same depth as the old `kiln/`) | 500 | 470 | **0** | 30 | identical behaviour to today |
| **B — `kiln/legacy/`** (one level deeper, as PRD §8.2 sketches) | 493 | 457 | **6** | 30 | 3 tests fail (`CR-1` scripts via `npm run`, `E5` real roadmap, `layout` doc links) and **3 test files do not load** (`doc-correction`, `findings`, `readme-pi-version`) |

**Rationale.** At least **9** legacy files reach above `kiln/` by relative path — `tests/netscan/untouched`,
`tests/pi/{findings,readme-pi-version,status,untouched}`, `tests/pi/ui/untouched`, `tests/runner/scripts`, `validate/_pi-driver`
(`REPO_ROOT = "../.."`) and `validate/pi-ready` — and other tests read the same locations through them. They open the real `specs/`,
`README.md` and `docs/`. Nesting legacy changes their depth, so they would have to be edited — which FR-004 / SC-003 forbid, and the
experiment above shows the failures are real. Placing `legacy/` as the root-level sibling of `kiln/` keeps every relative path valid
with **zero edits**.

**Alternatives.**
- `kiln/legacy/` (PRD §8.2's sketch) — rejected: the measurement above; it would force edits to frozen files or an exception to
  byte-identity.
- `kiln/legacy/` plus an exception list of edited files — rejected: weakens the one check that makes "frozen" mean something.
- Symlinks to recreate the old depth — rejected: fragile on Windows and in archives, and they hide the real layout.
- Rewrite the legacy tests to a depth-independent root finder — rejected: that *is* editing legacy; it belongs to the retirement
  work, not to a freeze.

**Consequence.** PRD §8.2's tree and §10 say `kiln/legacy/`; they are amended (task T-docs). Historical specs under `specs/00x-*`
that mention `kiln/src/...` keep describing the tree as it was; a note in the README maps old paths to `legacy/`.

---

## R2 — How packages import each other with no install and no build

**Decision.** One `kiln/package.json` with a Node **`imports` map** (`#contracts/*`, `#record/*`, `#lane/*`, `#cli/*`, `#checks/*` …)
pointing at each package's `src/`. Source files import other packages with `#record/log.ts`-style specifiers; within a package they
import relatively. No `node_modules`, no workspace linking, no build step.

**Measured.** A scratch tree with the same shape: a test in `packages/record/tests/` importing `#record/…`, which imports
`#contracts/…`; `node --test` passes on Node 25.9, passes when launched from a different working directory, and the glob
`packages/*/tests/**/*.test.ts` discovers it. Node strips the types of `.ts` files resolved through `imports` (they are not under
`node_modules`).

**Not measured here.** The declared floor, Node **22.18**, is not installed on this machine. The same mechanisms (`imports` since
Node 12; unflagged type stripping from 22.18) should hold; the quickstart includes a check that runs the suite on 22.18 with
`npx -y node@22.18.0` before the row closes (task T-verify). If it failed, the fallback is relative imports across packages, which
changes only specifiers.

**Rationale.** It keeps the README's promise — *"No runtime dependencies, nothing to `npm install`"* — and gives the boundary check
a single, greppable specifier shape to police (`#<package>/…`). Relative cross-package imports (`../../record/src/x.ts`) work too
but make the dependency direction invisible in the text.

**Alternatives.** npm workspaces with `@kiln/*` names — rejected: needs `npm install` to create the links, breaking the zero-install
property, and puts files behind `node_modules` symlinks that obscure paths. Relative cross-package imports — rejected as above
(kept as the fallback). A bundler/`tsc` build — rejected: FR-002 forbids a build step.

---

## R3 — Where a package states its responsibility

**Decision.** Each package has a `kiln.json` with a `responsibility` string — one sentence, the single source of truth. The
boundary check fails a package whose entry is missing or empty (`boundary-responsibility-missing`). There is no per-package
README duplicating it.

**Implementation finding (T019, 2026-10-23).** The file is `kiln.json`, not `package.json`: Node resolves `#` imports from the *nearest* `package.json`, and
forbids an `imports` target outside that package, so a `package.json` in each package would hide the root `imports` map and make cross-package imports
impossible without an install. Only `kiln/package.json` exists, so the one map serves every package.

**Rationale.** FR-001 asks for "its single responsibility in one place". A machine-readable field can be checked; prose in a README
cannot, and drifts. Empty packages (`durable`, `workers`, `director`, `server`, `web`) consist of just this `kiln.json`, which
git tracks, so they exist in a fresh clone. `kiln/checks/` — the tenth unit FR-001 lists — carries the same `kiln.json`, although it sits beside `packages/`, not in it.

**Alternatives.** README per package — rejected (unchecked, drifts). A central table only in `boundaries.json` — rejected: the
responsibility belongs next to the code it describes; the central file holds *rules*, not prose.

---

## R4 — Proving legacy is byte-identical

**Decision.** `kiln/checks/legacy-manifest.json`, generated **once, immediately after the move-only commit**, from the git blobs of the baseline commit
(`299b0a5…`, the tip of `main` when r12 started), not from the working tree. It records, for every tracked file under the old
`kiln/`: relative path, byte size, SHA-256, and git blob id; plus the baseline commit id and its `kiln/` tree id. `kiln check legacy` is **pure filesystem** (it must not spawn `git`: the network lint's denylist includes `node:child_process`, and the check lives in
`checks/`, which the lint scans):

1. recomputes SHA-256 for every file under `legacy/` and fails by name per file — `legacy-file-modified`, `legacy-file-missing`;
2. fails `legacy-file-added` for any file under `legacy/` that is not in the manifest, walking the directory and skipping only the manifest's
   `ignore` globs (`factory-log/*.jsonl`, `factory-log/*.log` — the runtime artifacts `.gitignore` already excludes), so no git is needed;
3. checks the copy record (R5) for consistency.

A **test** (`checks/tests/legacy-baseline.test.ts`, outside the lint's scan roots) adds the git evidence: when the baseline commit exists in the local
history it confirms `baseline.treeId` equals `git rev-parse <commit>:kiln` (`legacy-baseline-mismatch`), proving the manifest comes from the baseline
and was not generated from an already-edited tree; without history it **skips with a printed reason** — never silently.

**Rationale.** SC-003 demands 100% byte-identity "proven by a test". A manifest of hashes works on a shallow clone and in an
exported archive; the git cross-check adds evidence when history is available. Runtime artifacts under `legacy/factory-log/` (gitignored) are
skipped through the manifest's `ignore` globs.

**Alternatives.** `git diff -M` against the baseline at test time — rejected: fails on shallow clones and ties the check to history.
Hash only a subset — rejected (SC-003 says 100%). A committed tarball of the original — rejected: 750 KB of duplicate binary-ish
data for no extra assurance.

---

## R5 — Recording the duplication (NC2-A)

**Decision.** `kiln/checks/legacy-copies.json`: a hand-maintained list of pairs `{ legacy, ported, since, retiresWith }` — for example
`legacy/contracts/move-vocabulary.ts` ↔ `kiln/packages/contracts/src/flow/…`. `kiln check legacy` verifies that every `legacy` path
is in the manifest and every `ported` path exists. Ported files are *allowed to differ* from their legacy original (that is the
point of copying); the record exists so the duplication is visible and ends deliberately when legacy is retired.

**Rationale.** FR-004: "a record MUST list the duplicated files". Edge case "the two copies drift on purpose".

**Alternatives.** Infer duplicates by content similarity — rejected (fuzzy, slow). No record — rejected (FR-004).

---

## R6 — Where the flow version lives, and how a record names it

**Decision.**
- Flow definitions are **frozen TypeScript data** in `packages/contracts/src/flow/`: `v1.ts` reproduces `MOVE_VOCABULARY`, `GATE_NAME`,
  `MITIGATION_CAP` and the role roster of the first program exactly; `v2.ts` is the current constitution (v2.0.1 when written; **v2.1.0, twelve gates, since the 2026-10-25 amendment** — see below). Both satisfy one `FlowDefinition`
  type (see [data-model.md](./data-model.md)). r14 may move the representation to files; r12 fixes only the shape.
- A `gate-completion` record may carry an optional **`flow`** field, `"v1" | "v2"`, added to the *ported* factory-log schema (legacy's
  schema is untouched). **A record without it is v1** (FR-012). New records, from r15, always write `flow: "v2"`.
- The ported validator resolves a record's flow as `record.flow ?? options.defaultFlow ?? "v1"` and checks rule G3 against that
  flow's vocabulary. The CLI gains `--flow v1|v2`, which sets the default for records that name none.

**Measured.** With the first program's validator unchanged, the committed r7 walk passes (`PASS`). With only `"6-review"` changed to
`["approve","revise","restart"] ` in a scratch copy, the same walk still passes, and a hand-made `gate-completion` with `gate: 6,
move: "revise"` **fails v1** (`G3 … move "revise" not in MoveVocabulary(gate=6)`) and **passes v2**. So the two versions differ in
exactly one move set, and v2's sets are a superset of v1's.

**Rationale.** NC1-A. A record is judged by the rules it was made under; history is never rewritten; r15's replay of the old walks
needs the same distinction. The measurement also corrects the spec's NC1 premise (see plan §Findings).

**Incidental defect, fixed in the ported copy only.** The first program's G3 failure message prints `allowed: []` because the
helper is called with an empty list (`nameMove(…, [] as any)`). The ported validator has the flow in hand and prints the real allowed
moves. A ported test asserts the message names the flow and lists the moves; the legacy copy is untouched.

**Alternatives.** Put the version in a header record or a `.meta.json` sidecar — rejected: a sidecar can be lost; a per-record field
travels with the record. Infer the version from the move set — rejected: ambiguous (v2's sets contain v1's).

---

## R7 — The judge roster is part of the flow version

**Decision.** `FlowDefinition.roster` lists the judge roles: v1 = `architecture-critic`, `verifier`, `code-reviewer`,
`docs-synthesizer` (the four line-of-defense roles); v2 = `architecture-critic`, `design-critic`, `code-reviewer`, `ui-reviewer`, `verifier` (constitution v2.1.0, II) — plus any role a team's
added gate declares as a judge (declared in role files from r17; r12 accepts them as an input to `isJudge`). `bindRole(role, tier,
roster)` takes the roster as a parameter, so the same function serves both versions. The tier policy is otherwise unchanged:
a judge binds only to `strongest`; a weaker binding throws a named configuration error.

**Rationale.** WORK-2 as corrected on 2026-10-22 and constitution II. The first program's `strongest-model.test.ts` (5 cases) keeps
asserting the v1 roster; new cases assert that under v2 `docs-synthesizer` is not a judge, that the five v2 judges are refused below `strongest`, and that `design-critic` and `ui-reviewer` are not judges under v1 and a cheap binding for it is not refused as
a judge violation.

**Alternatives.** Two copies of `roles.ts` — rejected (duplicates the guard). Drop v1's roster — rejected (v1 records and the legacy
walks are *about* that roster).

---

## R8 — Splitting `scheduler.ts`

**Decision.** The first program's `src/scheduler.ts` mixes pure logic with a runner:

| Function | Depends on | Disposition in r12 |
|---|---|---|
| `switchCount(units)` | `WorkUnit` type | **port** → `packages/lane/src/affinity.ts` |
| `bindAll(units)` | `bindRole` (roles) | **port** (synchronous throw preserved) |
| `lodUnitsBoundStrongest(units)` | `isLineOfDefense` | **port** (renamed `judgeUnitsBoundStrongest` taking a roster; the legacy name stays in legacy) |
| `schedule(units, resident)` | `lane.ts` `run`/`makeLane`, a resident | **stays in legacy** — it *is* the lane runtime; it ports with the lane task (r13/r16) |

`WorkUnit` (a tiny interface: role, tier, name) is copied into `packages/lane/src/types.ts` — not imported from the legacy stub resident.
Three **new** tests cover the pure functions (same-tier boundary counts 0; a genuine tier change counts 1; a sub-strongest judge binding
throws *synchronously*, so `assert.doesNotThrow` cannot pass vacuously on a rejected promise), using an in-test list of units — no
resident needed. This is what FR-010 (as adjusted) promises.

**Rationale.** The scheduler's swap *pricing and recording* happen inside `run`, which is an adapt item; promising them in r12
would mean porting the lane runtime early. The pure affinity rule — the part constitution IV states — is portable and testable now.

**Alternatives.** Port `lane.ts` too — rejected (r13/r16 own it; it pulls in the log writer and resident). Port the scheduler with a stub
`run` — rejected (a fake of the thing being ported proves nothing).

---

## R9 — The network lint

**Decision.** Port `validate/_netscan.ts` to `kiln/checks/network-lint.ts` with its tokenizer, denylist, alias/computed-access
detection and never-vacuous guard. Differences from the first program's copy:
- **Scan roots**: `packages/*/src` and `checks/*.ts` (non-test source). Not `legacy/` (legacy keeps its own frozen lint over its own tree).
- **Allowlist**: `kiln/checks/network-allowlist.json` — `{ "entries": [] }` today — entries keyed by relative path from the scan root,
  never bare names; an entry naming a missing file fails (`allowlist-missing-file`); a bare name fails (`allowlist-bare-name`).
- **Loopback helper**: the first program's lint imports `isLoopbackHost` from the Ollama resident. The ported lint carries its own
  copy of that small pure function in `checks/loopback.ts`; nothing in `kiln/` imports `legacy/`.
- **Failure names**: `network-call` (e.g. `fetch(`), `network-import` (denylisted module), `network-alias`, `network-computed`,
  `network-zero-files`.
- The first program's "exactly one allowlist entry" rule is **not** carried over: the allowlist starts empty, and r16 adds the
  residency module as its first entry with its loopback-literal assertion. The old rule stays tested in legacy.

**Honesty.** It remains a lint, not a sandbox (its own header says so). Runtime enforcement arrives with the residency manager (r16).

**Alternatives.** Runtime observation now — rejected in clarification (no workers to observe until r16). Scan `legacy/` with the new
rules — rejected: legacy is frozen and already lint-checked by its own copy.

---

## R10 — The boundary check

**Decision.** `kiln/checks/boundaries.json` is the single rule file:
- `layers`: the dependency direction of PRD §8.2 — `contracts` ← `record` ← `durable` ← {`lane`, `workers`} ← `director` ← {`workshop`,
  `host`} ← `server` ← {`web`, `cli`, `editor`}; `team` and `explore` beside `workshop`; `knowledge`, `bench` declared with their
  allowed imports (they have no directory yet). A package may import only packages **earlier** in the chain, never a sibling.
- `pure`: `contracts` imports no `node:*` module (no I/O).
- `externals`: `{}` — **no bare specifiers anywhere in r12** (FR-002: no runtime dependency); a later row that adds Pi Durable or `pi-ai`
  adds its seam entry (`durable` only, `workers` only) in the same change.
- `legacy`: nothing in `kiln/` may import from `legacy/` (resolved path or specifier).
- `checks` and `cli`: `checks` may import `contracts` and `record`; `cli` may import `checks` and anything earlier in the chain.

The check reads import specifiers with the lint's tokenizer (so a specifier inside a string or comment is not read as an import),
classifies each (`relative` → resolved to a package by path; `#pkg/…` → that package; `node:` / bare), and fails by file and rule:
`boundary-forbidden-import`, `boundary-bare-specifier`, `boundary-legacy-import`, `boundary-contracts-io`,
`boundary-package-undeclared` (a directory under `packages/` not in the rule file), `boundary-responsibility-missing` (R3).
Zero files scanned fails (`boundary-zero-files`) — the never-vacuous rule again.

**Rationale.** FR-017, US5. A text rule file beats code: reviewers read it, and later rows extend it in the diff that needs the change.

**Alternatives.** `eslint-plugin-import` / dependency-cruiser — rejected: a dependency, against FR-002. Convention only — rejected (US5).

---

## R11 — The test runner and the Pi tier (NC "runner" clarification)

**Decision.** `kiln/tests/run.ts` replaces the first program's runner for the new suite and **also launches the legacy runner**
(`legacy/tests/run.ts`, frozen) as a second child, so `npm test` in `kiln/` runs everything:

```text
node tests/run.ts [--new-only | --legacy-only] [--live] [--cost] [--serial] [--pi] [paths…]
```

- New tests: `packages/*/tests/**/*.test.ts`, `checks/tests/**/*.test.ts`, `tests/**/*.test.ts` (excluding the runner's own fixtures).
- The runner refuses a run that executed zero tests, for each tier, as the first program's runner does.
- **Pi decision** (`decidePiTier`, a pure, unit-tested function): if the tier is not demanded (`--pi` absent and `KILN_PI !== "1"`),
  `pi --version` runs (binary from `KILN_PI_BIN` or `pi`), and the reported version is **not** in the measured list, the runner sets
  `KILN_PI=0` in the environment of the legacy child and prints once: `live-Pi tier skipped: Pi <installed> installed, measured [<list>]`.
  If Pi is absent, or the version is measured, or the tier is demanded, the environment is left alone.
- The measured list is one constant in `kiln/tests/measured-pi.ts`; a test asserts it equals `MEASURED_PI_VERSIONS` in
  `legacy/validate/_pi-driver.ts` by reading that file's text (new code may not import legacy), so the two cannot drift.

**Measured.** With `KILN_PI=0`, the legacy `pi-live` suite reports 11 tests skipped, 0 failed, each with the legacy gate's own reason
(*"Pi tier switched off: KILN_PI=0"*) — confirmed in the clarification step and again in the layout experiment (500 tests, 0 failures).

**Rationale.** The clarified answer (runner, not an edit to the legacy gate). Reusing the legacy runner keeps its zero-test refusal and its
`--pi` rule intact without copying them.

**Alternatives.** Edit the legacy gate — rejected in clarification. One merged runner that also owns legacy paths — rejected:
it would have to re-implement the legacy `--pi` pass counting.

---

## R12 — How `kiln` is invoked in r12

**Decision.** `kiln/package.json` gets `"scripts": { "kiln": "node packages/cli/src/main.ts", "check": "node packages/cli/src/main.ts check", … }`,
so `npm run kiln -- check` and `npm run check` work, and `node kiln/packages/cli/src/main.ts check` works from anywhere. A `bin` entry for a
global `kiln` command waits for the installer (r32).

**Rationale.** r12 adds one command, text output; a `bin` shim adds platform concerns (executable bits, Windows) that belong to the installer row.

**Alternatives.** `bin` now — rejected as above. A separate `kiln-check` script name — rejected: PRD names `kiln check`.

---

## R13 — Test census: what ports, what waits

Counted on 2026-10-23 (`test(`/`it(` cases per file, directories `contract`, `negative`, `netscan`, `scheduler`, `switch-cost`):

| Legacy test file | Cases | Disposition | New home | Note |
|---|---|---|---|---|
| `contract/gate-rail` | 6 | **port** | `contracts/tests/` | case "review is approve/restart — NO revise" becomes a **v1** assertion; a new **v2** case asserts `approve · revise · restart` (constitution v2.0.1) |
| `contract/log` | 9 | **port** | `record/tests/` | schema path updated |
| `contract/roadmap` | 3 | **port** | `record/tests/` | reads a copy of the blank roadmap fixture (`record/tests/fixtures/roadmap-blank.md`) |
| `negative/no-silent-approval` | 4 | **port** | `record/tests/` | |
| `negative/roadmap-m3` | 7 | **port** | `record/tests/` | schema path updated |
| `negative/strongest-model` | 5 | **port** | `contracts/tests/` | runs against the v1 roster; v2 cases are new |
| `netscan/bypass` | 7 | **port** | `checks/tests/` | |
| `netscan/hardened` | 7 | **port** | `checks/tests/` | the "real directory" case scans a real `packages/…/src` |
| `netscan/strictly-stronger` | 3 | **port** | `checks/tests/` | |
| `netscan/untouched` | 3 | **port** | `checks/tests/` | historical git-range assertions about r7; independent of location; skips without history |
| **Subtotal ported** | **54** | | | |
| `negative/async-await` | 4 | **wait** → r16 | legacy | subject `validate/runtime-ready.ts` (a readiness probe on the lane runtime) |
| `negative/not-silent` | 5 | **wait** → r16 | legacy | subject: the live resident |
| `netscan/allowlist` | 6 | **wait** → r16 | legacy | subject: the Ollama resident's allowlist entry |
| `scheduler/scheduler` | 3 | **wait** → r13/r16 | legacy | subject: `schedule` and the stub resident; the pure part gets 3 **new** tests (R8) |
| `switch-cost/switch-cost` | 1 | **wait** → r16 | legacy | live-gated; subject: the Ollama and live residents |
| **Subtotal waiting** | **19** | | | listed in `legacy-copies.json` with the row that ports each |

54 + 19 = **73**, the count the spec cites. Every case also keeps running, unchanged, in legacy (NC2-A). "Path updated" is a location
change, not a changed expectation; only the `gate-rail` review case changes an expectation, and it cites constitution v2.0.1.

**New tests added** (not counted toward the 54): flow v1/v2 data against the constitution and PRD (SC-004); the three pure-affinity
cases; roster v2; `kiln check` behaviour; runner Pi decision; measured-list equality; boundaries and legacy-identity negatives; the
G3 message lists the flow's real moves.

---

## R14 — Fixtures

**Decision.** `kiln/fixtures/` receives byte-for-byte copies of `r7-live-inference.jsonl`, `r7-live-broken.jsonl` and
`r7-live-inference.meta.json` (the committed real walk; PRD §10.1). Legacy keeps its own copies under `legacy/fixtures/` (NC2-A).
The legacy `fixtures/pi/` extension fixtures are not copied (they belong to the frozen Pi tier). The meta file's "regenerate only via
`npm run capture-fixture`" note applies to the legacy copy; the new copy is read-only evidence, and `legacy-copies.json` lists both.

---

## R15 — Git history

**Decision.** Three kinds of commit, in this order, so review and history stay legible:
1. **Baseline** — generate `legacy-manifest.json` from the baseline commit's blobs (no file moves yet).
2. **Move only** — `git mv kiln legacy`, plus `.gitignore` path patterns. The commit changes no file content; `kiln check legacy`
   passes on it, and the full legacy suite passes with the Pi tier off. Git records it as 168 renames.
3. **New code** — packages, checks, runner, CLI, docs, in small commits per package. Ported files are new files (copies); `git log -C`
   links them to their origin.

**Rationale.** A move-only commit is trivially reviewable and its byte-identity is checkable; mixing moves with edits hides both.

---

## R16 — Other findings kept for the tasks

- **Hidden dependency of kept tests on adapt modules** — counted in R13; `_netscan.ts` also imported `isLoopbackHost` from the Ollama
  resident (R9).
- **`legacy/package.json` keeps `"name": "kiln"`** and the old scripts; they work with `legacy/` as the working directory
  (`cd legacy && npm run runtime-ready`). The README's "Try the foundation" commands change accordingly.
- **`.gitignore`**: `kiln/factory-log/*.jsonl|*.log` patterns gain `legacy/factory-log/…` equivalents (the dogfood scripts write there).
- **Docs that name old paths**: the README, PRD §8.2/§10, and `docs/architecture/explainers/kiln-v1.md` (§5.2) — updated in the docs task;
  historical specs and archived roadmaps are left as the records they are.
- **Spec Kit tooling** (`.claude/`, `.specify/`) is not part of either tree and is untouched.

## R16 — The twelve-gate flow (amendment 2026-10-25)

**Trigger.** `main` gained constitution 2.1.0 (PR #1): the default flow is the Roadmap gate plus eleven feature gates; *Design* is named
*Architecture*; *Experience design* (`2a-experience`) and *UI review* (`6a-ui-review`) are built in, conditional on a deterministic `applies_when`; the judges
include the design critic and the UI reviewer. PRD GATE-1/GATE-3/FLOW-2 and `docs/concepts/ui-flow.md` carry the detail. `specs/ROADMAP.md` and the r14 row
still say ten gates.

**Decision (human@batorfi, 2026-10-25).** Flow v2 is the twelve-gate flow now, as **data only**: gates, keys, names, questions, moves, judges, roster, and the
`appliesWhen` declaration. Evaluating `applies_when`, the *not applicable* outcome and the walk stay with r14/r15.

**Measured before deciding.**
- v1 data and `bindRole` are unaffected: the parity script (legacy vs `contracts`) gave 0 mismatches before and after.
- The committed walks use gates 1…9 only, so they pass v1 and v2 (v2 contains v1's gates and its move sets contain v1's).
- The new ids are not integers: `GateId` gains `"2a"` and `"6a"` rather than renumbering the first program's 1…9; the new schema copy admits them; the legacy
  schema is untouched.
- No new move kind: "approve with note" is an *approve* with a required note (`ui-flow.md` §4.4, §5.4).

**Alternatives.** (2) Keep v2 as the ten-gate v2.0.1 flow and add a v3 in r14 — rejected: the tests that read the live constitution could not pass, and r12 would
ship a "current" flow the constitution no longer calls current. (3) Wait for the next Roadmap gate — rejected by the human.

**Follow-ups outside this row** (listed in the verification report): the next Roadmap gate decides the `edit-rows` text of `60a2c7e` (r12, r14, r15, r17, r19, r20, r22, r28–r30, r32, r43); the explainers
(T081, partly regenerated in `60a2c7e`); `kiln check flow` (r14) will check the twelve-gate invariants.
