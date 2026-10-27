# Quickstart: validating the foundations reset (row r12)

**Branch**: `009-kiln-foundations-reset` | **Date**: 2026-10-23 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

How to prove r12 works end to end. Every scenario names the spec story it proves and the success criterion it settles. The commands run **after**
the row is implemented; until then they describe what "done" looks like.

**Prerequisites** *(as of r12; see r13 — the floor is now `^22.19.0 || >=23.6.0` and `cd kiln && npm ci` is one install step)*: Node `^22.18.0 || >=23.6.0` (no `npm install` needed — nothing to install), git, a clone of the repository. Optional: Ollama and Pi
(the live tiers skip, printing why, without them).

All commands run from `kiln/` unless stated.

## 0. The shape on disk

```bash
ls ..                       # legacy/  kiln/  docs/  specs/  …      (legacy/ is a sibling of kiln/)
ls packages                 # contracts record durable lane workers director server web cli
ls checks                   # network-lint.ts boundaries.ts legacy-identity.ts boundaries.json network-allowlist.json legacy-manifest.json legacy-copies.json …
cat packages/*/kiln.json checks/kiln.json | grep responsibility       # one sentence per unit (FR-001)
```

**Expect**: nine packages plus `checks/`, each with a responsibility; no `node_modules`; `git status` clean on a fresh clone. *(US1.2)*

## 1. The whole suite is green — on this host and on a host with the measured Pi *(US1, US2 · SC-001, SC-002)*

```bash
npm test
```

**Expect** (on a machine with an installed Pi that is not on the measured list — here Pi 1.4.0; the version in the first line is whatever `pi --version` says):

```text
live-Pi tier skipped: Pi 1.4.0 installed, measured [0.85.1]
new: 184 tests · legacy: 500 tests (30 skipped)
exit 0   — 0 failures
```

- The live-Pi tests appear as **skipped**, never failed. The versions are printed once, by the runner. *(US2.2)*
- At least **54** new test cases are the ported ones (the census in [research R13](./research.md)); with the new tests the new suite is larger.
- On a machine with Pi 0.85.1 the line is absent and the Pi tier runs as the first program's did.

```bash
npm test -- --pi              # DEMAND the tier on this host (an unmeasured Pi)
```

**Expect**: the live-Pi tests run and **fail by name** — `pi-version-unmeasured` — instead of skipping (*US2.4*): a demanded tier is never silently skipped.

## 2. Legacy is frozen, and says so *(US2.1 · SC-003)*

```bash
npm run kiln -- check legacy
```

**Expect**: `PASS legacy — scanned 168 files`, with a note naming the baseline (`299b0a5…`), the ignored globs and the 19 deferred cases.

Prove it can fail — in a scratch copy, so nothing real changes:

```bash
cp -R .. /tmp/kiln-scratch && cd /tmp/kiln-scratch/kiln
printf '\n' >> ../legacy/src/roles.ts
npm run kiln -- check legacy        # FAIL legacy-file-modified  legacy/src/roles.ts
rm -rf /tmp/kiln-scratch
```

**Expect**: exit 1, naming the file. Deleting a file gives `legacy-file-missing`; adding one gives `legacy-file-added`; a new `legacy/factory-log/x.jsonl` does **not**.

## 3. The flow and the judges as data *(US3 · SC-004, SC-005, SC-008)*

```bash
node tests/run.ts --new-only packages/contracts/tests   # flow v1/v2 against the first program's vocabulary, the constitution and PRD GATE-1/GATE-2
node packages/record/src/log.ts fixtures/r7-live-inference.jsonl                  # PASS — flow v1 by default (the record names none)
node packages/record/src/log.ts fixtures/r7-live-inference.jsonl --flow v2        # PASS — v2's moves contain v1's
printf '%s\n' '{"ts":"2026-01-01T00:00:00Z","seq":1,"recordType":"gate-completion","gate-completion":{"gate":6,"move":"revise","cost":{"switches":0,"wallClock":"00:01"},"decidedBy":"human@x"}}' > /tmp/rev.jsonl
node packages/record/src/log.ts /tmp/rev.jsonl                 # FAIL — G3 … move "revise" not in MoveVocabulary(gate=6, flow=v1); allowed: approve, restart
node packages/record/src/log.ts /tmp/rev.jsonl --flow v2       # PASS
```

**Expect** exactly those outcomes: the committed walk passes under both versions; a Code review `revise` fails v1 by name and passes v2. The tier policy: a judge bound below
`strongest` is refused (`G2/L1 config error … must be "strongest"`) under both rosters; `docs-synthesizer` is a judge under v1 and **not** under v2; `design-critic` and `ui-reviewer` are judges under v2 only. A v1 record naming gate `2a` or `6a` fails G3 by name.

## 4. The network lint *(US4 · SC-006)*

```bash
npm run kiln -- check network        # PASS network — scanned N files   (note: allowlist: 0 entries)
```

Prove it can fail (scratch tree; the lint reads source, it does not run it):

```bash
cp -R .. /tmp/kiln-scratch && cd /tmp/kiln-scratch/kiln
printf 'export const x = () => fetch("http://example.com");\n' > packages/lane/src/oops.ts
npm run kiln -- check network        # FAIL network-call  packages/lane/src/oops.ts
printf 'export const y = globalThis["fe" + "tch"];\n' > packages/lane/src/oops.ts
npm run kiln -- check network        # FAIL network-computed
printf 'export const m = () => import("node:" + "http");\n' > packages/lane/src/oops.ts
npm run kiln -- check network        # FAIL network-computed   (a load built at run time cannot be read from the source)
printf 'export const m = () => import ("node:http");\n' > packages/lane/src/oops.ts
npm run kiln -- check network        # FAIL network-import
rm -rf /tmp/kiln-scratch
```

**Expect**: each fails naming the file and the construct. A scan root with no files fails `network-zero-files` — a check that saw nothing never passes. It is a **lint of source**, not a
runtime monitor; runtime enforcement arrives with the residency manager (r16).

## 5. Package boundaries *(US5 · SC-007)*

```bash
npm run kiln -- check boundaries     # PASS boundaries — scanned N files   (note: 17 layers declared; 0 external seams; rules: …)
```

Prove it can fail:

```bash
cp -R .. /tmp/kiln-scratch && cd /tmp/kiln-scratch/kiln
printf 'import "#lane/affinity.ts";\nexport const z = 1;\n' > packages/record/src/oops.ts
npm run kiln -- check boundaries     # FAIL boundary-forbidden-import  packages/record/src/oops.ts
rm packages/record/src/oops.ts
printf 'import fs from "node:fs";\nexport const z = fs;\n' > packages/contracts/src/oops.ts
npm run kiln -- check boundaries     # FAIL boundary-contracts-io
rm packages/contracts/src/oops.ts
printf 'import{a}from"#lane/affinity.ts";export const z=a;\n' > packages/record/src/oops.ts
npm run kiln -- check boundaries     # FAIL boundary-forbidden-import   (no spaces needed to hide it)
rm -rf /tmp/kiln-scratch
```

**Expect**: each fails by file and rule. All three checks together: `npm run check` → exit 0 on the real tree.

## 6. Nothing was lost *(US1.3 · SC-002 · FR-015)*

```bash
node tests/tools/count-ported.ts      # the census: every ported file with its case count on both sides, the 19 waiting files, and PASS or FAIL
```

**Expect**: the 19 deferred test cases appear by file, each with the row that will port it (`r13`, `r16`); the ported entries cover the 54. Both sets still pass:
the ported ones in `kiln/`, all 73 originals in `legacy/`.

## 7. The declared Node floor *(plan risk — research R2)*

```bash
npx -y node@22.18.0 tests/run.ts --new-only      # the new suite on the oldest supported Node
```

**Expect**: the same pass count as on the installed Node. If it fails, the fallback is relative cross-package imports (R2) — a specifier change only.

## Done when

- Scenarios 1–7 behave as stated, on a fresh clone.
- `npm test` exits 0 here (with an unmeasured Pi) and the SC table in [plan.md](./plan.md) §Verification is ticked.
- `specs/ROADMAP.md` is unchanged and row r12 is still `queued` (constitution VI; FR-021) — closing the row is the human's Roadmap-gate move.
