# Contract: `kiln check flow`, its negative suite, and the CLI

**Files**: `kiln/checks/flow.ts` (the check) · `kiln/checks/tests/flow-negative.ts` + `flow-check.test.ts` (the suite) · `kiln/packages/cli/src/{main,gate-commands,feature-commands}.ts` · **Requirements**: FLOW-7 (default flow), FR-040 … FR-043, FR-054 · Pattern: r12's three checks (`checks/index.ts`, stable codes, never vacuous, planted violations).

## 1. The check

`checkFlow(opts?: { flow?: FlowDefinition }): CheckResult` — default `flowOf("v2")`. It calls `validateFlow` (contracts, pure), maps each `Fault` to `{code, file?, detail}` (the gate key goes in `detail`; `file` is `packages/contracts/src/flow/v2.ts` for the shipped flow), and sets `scanned` to the data files read (1, the flow's own data file) with the note `N gates examined`. **All-or-nothing**: every fault is reported before the result is `ok: false`. zero gates examined is itself a failure (`flow-vacuous`). `CheckName` gains `"flow"`; `CHECK_NAMES = ["network","boundaries","legacy","flow"]`; `kiln check flow` and `kiln check` (all four) work; unknown names are refused as today.

## 2. The codes (stable names; each is one rule of FR-041)

| Rule | Code | Fires when |
|---|---|---|
| anchors | `flow-anchor-first` · `flow-anchor-last` · `flow-after-merge` | first gate is not `gate0` · last is not `9-pr` · any gate after `9-pr` |
| presence/order | `flow-builtin-missing` · `flow-builtin-order` · `flow-gate-duplicate` | a built-in gate absent · built-ins out of the constitution's order · a key twice |
| conditional gates | `flow-conditional-placement` · `flow-conditional-unexpected` | `2a`/`6a` not directly after Architecture / Code review · `appliesWhen` on any other gate · an interface gate without one |
| globs | `flow-glob-unsupported` | an `appliesWhen.paths` entry outside the dialect |
| roles and judges | `flow-role-unknown` · `flow-judge-not-judge` | a `judge`/`check` not in the roster · a producer named as a gate's judge · a judge missing from `roster.judges` |
| move kinds | `flow-move-kind-unknown` · `flow-move-wrong-scope` · `flow-mitigate-person-move` · `flow-rule-missing` | kind outside `MOVE_KINDS` · a row edit on a feature gate or a feature kind at `gate0` · `mitigate` in a person's `moves` · a move with no `rule` |
| notes | `flow-note-not-required` | `revise`/`reject`/`restart`/`split+revise` with `note !== "required"` |
| `returns_to` | `flow-returns-to-invalid` | a target that is not an earlier gate, `@build` (after a `restorePoint`), or `roadmap` where `targets.roadmap` is not set · roadmap allowed anywhere but Concept and Merge · a forward or self target where `earlier` is the rule |
| restart | `flow-restart-no-restore-point` | `restart` in a flow with no gate marked `restorePoint` before it |
| mitigate | `flow-mitigate-cap-invalid` · `flow-mitigate-no-cap` | `mitigationCap` outside `0..3`, default outside `[min,max]` · an `automatic: ["mitigate"]` gate without a cap |
| triage | `flow-triage-forbidden` | `triage: "skippable"` on anything but Concept and Architecture (Documentation never) |
| arming | `flow-arming-point` · `flow-arming-roadmap` · `flow-arming-added-gate` · `flow-delegable-invalid` | `armsTail` on a gate other than `3-spec`, or on none, or twice · on `gate0` · on `origin: "added"` · `delegable` other than `never` on `gate0`, the interface gates and anything before the arming point |
| cycles | `flow-cycle` | the placement graph has a loop: the order revisits a gate, or gates with a reserved `after` reference (added gates, `origin: "added"`, r26's) form a cycle. `returns_to` edges are backward by rule (`flow-returns-to-invalid`) and bounded by a person's move, so they are not cycle edges; the detector is real in r14 because the negative suite feeds it two added gates that point at each other |
| shape | `flow-vacuous` · `flow-version` | no gate examined · `version` not in `v1|v2` |

`v1` is not run through `flow`: the check is for the default flow (FLOW-7 *Must (default flow)*); asking for it names why.

## 3. The negative suite

`flow-negative.ts` exports `NEGATIVE: { rule: string; code: string; faults: number; mutate(def: FlowDefinition): FlowDefinition }[]`, every `mutate` applied to a **deep copy** of `v2`. There is **at least one member per code above** and these multi-fault members: *(anchor-first + builtin-missing)* → both reported, and *(arming-roadmap + cap-invalid + unknown judge)* → all three. `runNegativeSuite(check)` returns `{ accepted: member[]; wrongCode: member[]; missed: code[] }`.

`flow-check.test.ts` asserts, each by name: the shipped flow passes with the note `12 gates examined` · `accepted`, `wrongCode`, `missed` are all empty · a member that fixes its own fault (a "repair" of each mutation) makes the check pass again (so a failure is the fault's, not noise) · **a stub check that accepts everything makes the suite fail** with every member in `accepted` · a flow with no gates fails `flow-vacuous` · two-fault members report both.

## 4. The CLI

```
kiln check [network|boundaries|legacy|flow]… [--json]

kiln owner   --store <dir>
kiln gate    open|move|state …                       # r13; `move` gains:
             move --store <dir> --gate <id> --key <k> --kind <kind> --by <decider> --brief-ref <hash>
                  [--note <text>] [--target <gate|@build|roadmap>] [--admit <file.json>]
kiln feature admit --store <dir> --key <k> --feature <f> --walk <file.json>
             next  --store <dir> --feature <f> [--after <gateId>]        # waits for a change; prints one JSON line
             state --store <dir> --feature <f>
             move  --store <dir> --feature <f> --key <k> --by <decider> --target <gate|@build> --note <text>
```
One JSON line out per command; exit codes as r13. `feature next` is the only command that waits, and it waits for an event the owner pushes, never by asking again. `kiln feature move` always means `reject` (the only feature-level kind). A completer still never opens the store. The usage text is in `gate-usage.ts` (printable without loading the durable package, as r13 requires of `kiln check`).

## 5. The scripted walk driver (test support, not product)

`kiln/tests/walk/drive.ts` shells out to the CLI above: `admit` → loop { `next --after <last>` → pick the move from a script `{gateKey|"*": move}` → `gate move` } until the walk ends, recording every JSON line. The two acceptance scripts are `fixtures/walk-interface.json` (all approvals, facts that touch `web/**`) and `fixtures/walk-plain.json` (all approvals, facts that do not). The driver's `--by` is `script:r14` and is recorded as given; no claim is made that it is a person (spec Assumptions).
