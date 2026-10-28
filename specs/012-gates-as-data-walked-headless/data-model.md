# Data model: Gates as data, walked headless (row r14)

Types in KILN's own words (no library names). §1–§2 are **flow data** (`packages/contracts`, pure); §3–§5 are **walk state** (`packages/durable`); §6 the **outbox** additions; §7 the **oracle** additions. Everything else in r13's data model (`specs/011-…/data-model.md`) is unchanged. Rationale for each choice: [research.md](./research.md).

## 1. The flow definition (extends `contracts/src/flow/types.ts`)

All new fields are **optional**: `v1` is untouched and the first program's records still validate under both flows (r12 SC-008). The engine and the check apply the new rules to `v2`.

```ts
type Target = GateKey | "@build" | "roadmap";        // "@build": after Implementation, before Code review (R11)

interface MoveRule {
  note: "required" | "optional";                      // corrective kinds: required (FR-020)
  leads: "next"                                       // approve
       | "same-gate"                                  // revise (author / workers per `authors`), reject without target
       | "workers-then-same-gate"                     // revise at Code review and UI review
       | "rebuild-then-recross"                       // restart
       | "split"                                      // split+revise
       | "roadmap-edit";                              // edit-rows · add-row · drop-row (Roadmap gate)
  /** reject only: what the move may name besides its own gate. */
  targets?: { earlier: true; roadmap?: boolean; default: "same-gate" | "@build" };
}

interface GateDefinition {                            // existing fields unchanged, plus:
  origin?: "built-in" | "added";                      // absent = built-in; "added" is r26's — the check refuses arming on it
  after?: GateKey;                                    // reserved for added gates (r26): where the gate sits; the check follows it for cycles
  rules?: Partial<Record<MoveKind, MoveRule>>;        // one per kind in `moves` (+ `automatic`)
  triage?: "skippable";                               // Concept, Architecture only
  armsTail?: true;                                    // Specification only (data + check; r21 acts on it)
  delegable?: "never" | "default" | "explicit";       // Roadmap/Experience/UI review: never · Work plan…Documentation: default · Merge: explicit
  restorePoint?: true;                                // Implementation: the commit `restart` rebuilds from
}
interface FlowDefinition { /* unchanged */ noTriageSkip?: boolean }
```

`v2.ts` fills them in (see [contracts/flow-data.md](./contracts/flow-data.md) §2 for the full table). Invariants the **check** enforces over it are in [contracts/check-flow.md](./contracts/check-flow.md).

## 2. Facts, applicability and reasons (`contracts/src/flow/applies.ts`)

```ts
interface AdmissionFacts { paths?: string[]; labels?: string[]; journeys?: string[] }   // supplied (r18 will compute them)
interface BuiltFacts     { ui_files_changed?: boolean; tokens_changed?: boolean; routes_changed?: boolean }

type Applicability = {
  gate: GateKey;
  applies: boolean;
  why: "rule" | "required" | "unconditional" | "became-applicable";
  reason: Reason;                                      // canonical JSON: same facts → same bytes
};
interface Reason {
  rule: { paths?: string[]; labels?: string[]; journeys?: "any"; diff?: string[] };
  evaluated: { paths: "match" | "no-match" | "absent"; labels: …; journeys: …; diff?: … };
  verdict: boolean;
  text: string;                                        // one plain sentence built from the above, no clock, no model
}
```

Rules: OR across predicates; a missing fact is `absent` and counts false (FR-012); `required` wins over the rule and can never be undone (FR-013); `became-applicable` is only produced for UI review at its slot (FR-016).

## 3. The walk (`durable/src/walk/`)

### 3.1 `WalkInput` — the `walk` form of `kiln.row`'s input (validated by name before anything is written)

```ts
interface WalkInput {
  feature: string;
  flow: "v2";                                          // "v1" is refused by name (FR-052)
  facts: AdmissionFacts;
  built?: BuiltFacts;                                  // read once, at UI review's slot
  triage?: { skip: boolean; reasoning: string };       // a proposal; admission may override
  verifier?: ("pass" | "fail")[];                      // scripted verdicts, consumed in order; default: always pass
  script?: { sameContent?: GateKey[]; stepMs?: number }; // test knobs: a fresh author yields identical content (R9); work a kill can interrupt
}
```

### 3.2 The row's checkpoint (the whole state of a walk, committed with each transition)

```ts
type WalkCheckpoint =
  | { phase: "admit" }                                                    // open the admission gate
  | { phase: "admission"; gateId: string }                                // wait for the Roadmap gate's approve
  | { phase: "pin"; admission: AdmissionRecord }                          // evaluate once, record, advance — ONE commit
  | { phase: "work"; w: WalkState; unitIds: TaskId[] }                    // scripted author/judge/worker units of the cursor gate
  | { phase: "open"; w: WalkState }                                       // open the cursor gate's next round (keyed)
  | { phase: "decide"; w: WalkState; gateId: string }                     // wait for the gate task (settled or withdrawn)
  | { phase: "consume"; w: WalkState; gateId: string };                   // read the stored record, apply the consequence

interface WalkState {
  pinned: { applicability: Record<GateKey, Applicability>; skipped: Record<GateKey, string>; required: GateKey[]; cap: 0|1|2|3; overrideTriage: boolean };
  cursor: GateKey;                                     // the gate being worked on / waiting on
  rounds: Partial<Record<GateKey, number>>;            // last round opened per gate
  approved: Partial<Record<GateKey, { round: number; upstream: Record<GateKey, string> }>>;  // vector of artifactRevs at approval (R9)
  revs: Partial<Record<GateKey, string>>;              // current artifactRev per gate
  instruction?: { from: string; note: string };        // the note that becomes the next step's instruction (FR-020)
  recross?: { target: Target; gates: GateKey[]; since: number };
  fix: { used: number; verdicts: ("pass"|"fail")[] };  // Verification's automatic rounds this pass
  history: Outcome[];                                  // below
}
type Outcome =
  | { gate: GateKey; kind: "settled"; round: number; move: MoveKind; key: string }
  | { gate: GateKey; kind: "not-applicable"; reason: Reason }
  | { gate: GateKey; kind: "skipped"; reasoning: string }
  | { gate: GateKey; kind: "withdrawn"; round: number; by: string }
  | { gate: GateKey; kind: "became-applicable"; reason: Reason };
```

`phase` names are the row's resume points; `consume` is idempotent (re-reading the same stored record gives the same next state).

### 3.3 `kiln.walk/<feature>` — the one new document family (`DocName "kiln.walk"`)

```ts
interface WalkDoc {
  feature: string;
  status: "admitting" | "active" | "left-lane" | "not-admitted" | "done";
  openGateId: string | null;                           // set in the SAME commit that opens a walk gate
  moves: Record<Key, FeatureMoveRecord>;               // keyed exactly once
  pending: FeatureMoveRecord | null;                   // recorded, not yet consumed by the row
}
interface FeatureMove { kind: "reject"; decidedBy: string; target: Target; note: string }
interface FeatureMoveRecord { key: Key; move: FeatureMove; decidedAt: number; effect: "withdrew" | "recorded"; gateId?: string }
```

`kiln.withdrawal/<gateId>` is **not** a separate family: it is `kiln.move/<gateId>` with `record: null` plus `withdrawn: {key, by, at}` (added field; r13 documents are open objects) — one document to read for a gate's end.

### 3.4 Gate additions (extends r13's `GateSpec`, `GateDocument`, `Move`, `MoveRecord`, `GateState`)

```ts
interface Move { kind; decidedBy; briefRef; note?: string; target?: Target; admit?: Admit }
interface Admit { require?: GateKey[]; overrideTriage?: boolean   /* true = ignore the triage proposal */; fixRounds?: 0 | 1 | 2 | 3 }   // only on `approve` at gate0
interface GateSpec { …; returnsTo?: Target[]; walk?: { feature: string } }                    // `walk` binds the opening to kiln.walk/<feature>
interface GateDocument { …; noteRequired: MoveKind[]; returnsTo: Target[] }                  // stored once at opening, like `vocabulary`
type GateState = { state: "unknown" } | { state: "waiting" } | { state: "settled"; record: MoveRecord }
               | { state: "withdrawn"; key: Key; by: string };
```

Equality for `repeat`/`key-conflict` compares `kind, decidedBy, briefRef, note, target, admit` (canonical JSON). A gate opened without `walk` behaves exactly as in r13.

## 4. Identities

| Thing | Identity |
|---|---|
| gate round | `gate:<feature>:<gateKey>:<round>` (r13's pattern; round starts at 1; the admission gate is `gate:<feature>:gate0:<n>`) |
| open command | `walk:<feature>:open:<gateKey>:<round>` |
| work unit | created by the row under the command key `walk:<feature>:unit:<gateKey>:<round>:<role>` |
| fix round | `walk:<feature>:fix:<round>:<n>` (round = the Verification round it belongs to) |
| feature move | the caller's key; `repeat` if equal, `key-conflict` if the same key names another move |
| artifactRev | `sha256(canonical{gateKey, contentLabel, upstream revs, note})` |

## 5. State transitions of a gate within a walk

```
(not opened) ──open──▶ waiting ──person's move──▶ settled(kind) ─┬─ approve ─────────▶ next applicable gate, round 1 (or r+1 if re-crossed)
      │                    │                                      ├─ revise  ─────────▶ same gate, round+1   (note → author/workers)
      │                    └──feature-level reject──▶ withdrawn   ├─ reject  ─────────▶ same gate round+1 · or target T: re-cross T…end · or roadmap: left-lane
      │                                                           ├─ restart ─────────▶ rebuild, re-cross @build…end
      │                                                           └─ split+revise ────▶ record proposal; re-cross 4-plan…end
      ├─ pinned not-applicable ─▶ recorded once, never opened         (Experience design · UI review)
      └─ triage skipped ────────▶ recorded once, never opened         (Concept · Architecture)
```

A gate in `waiting` is never touched by anything but a person's move or a feature-level withdrawal; the row's `decide` phase has no path that writes a move record.

## 6. Outbox additions (`OutboxType`; actor and cause on every entry, as r13)

| Type | Subject | Actor | Cause | Data |
|---|---|---|---|---|
| `walk.admitted` | feature | the Roadmap-gate decider | the move key | pinned applicability, required, skipped, cap |
| `gate.not-applicable` | gate key | `factory` | `walk:<feature>:pin` | the `Reason` |
| `gate.became-applicable` | gate key | `factory` | `walk:<feature>:ui-slot` | the `Reason` |
| `gate.skipped` | gate key | `factory` (triage) | `walk:<feature>:pin` | the reasoning |
| `gate.withdrawn` | gate id | the feature-move decider | the feature-move key | target, note |
| `walk.returned` | feature | the decider of the reject/restart | the move key | target, gates to re-cross, note |
| `walk.fix-round` | feature | `factory` | the fix-round key | kind `mitigate`, n, cap, verdict |
| `walk.split` | feature | the decider | the move key | the remainder (a proposal) |
| `walk.left-lane` | feature | the decider | the move key | from which gate |
| `walk.not-admitted` | feature | the Roadmap-gate decider | the move key | the note (a `reject` at the admission crossing) |
| `walk.completed` | feature | the Merge decider | the move key | gates settled, skipped, not applicable |

r15 adopts these entries as it adopts r13's; the schema is not frozen here.

## 7. Oracle and inspection additions (`durable/tests/proof/support/oracle.ts`, `inspect.ts`)

- **I1–I3** learn a third end of a gate: `withdrawn` (no move record, decision task terminal, `gate.withdrawn` entry present).
- **I10** — *withdrawn ⇔ a withdrawal on the gate document ∧ the decision terminal with `withdrawn:true` ∧ no move record ∧ the feature's record of the move*. A withdrawn gate is never also settled.
- **W1** — per feature, the outcomes in order equal the flow's order restricted to the pinned applicable gates, plus re-crossings; no gate has two *settled* records for the same round.
- **W2** — every `not-applicable`/`skipped`/`became-applicable` entry appears exactly once and its reason equals the engine's recomputation from the pinned facts.
- **W3** — no walk outcome has a clock, a restart or the owner as its decider; `settled` and `withdrawn` name a decider from a move.
- **W4** — automatic rounds ≤ the pinned cap; each is `mitigate` by `factory`; none coincides with a `settled`.
- **Walk equality** — a killed-and-resumed walk's outcome list equals the uninterrupted walk's (the proof's headline).
