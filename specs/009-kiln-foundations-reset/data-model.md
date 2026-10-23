# Data Model: Foundations reset (row r12)

**Branch**: `009-kiln-foundations-reset` | **Date**: 2026-10-23 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

r12 adds no persistent runtime state. Its data is **static, checked-in structures** — the flow definitions, the tier-policy roster, and the
rule/record files the checks read — plus two small result shapes. The key entities of the spec map as follows.

| Spec entity | Realised as | Lives in |
|---|---|---|
| Package | a directory with `package.json` + `kiln.responsibility`; rules in `boundaries.json` | `kiln/packages/*`, `kiln/checks/boundaries.json` |
| Legacy tree | the moved first-program tree + `LegacyManifest` | `legacy/`, `kiln/checks/legacy-manifest.json` |
| Keep-list item | a `CopyRecord` (legacy ↔ ported, or legacy-only + the row that ports it) | `kiln/checks/legacy-copies.json` |
| Flow definition | `FlowDefinition` (v1, v2) | `kiln/packages/contracts/src/flow/` |
| Move kind | `MoveKind` — the closed set | `kiln/packages/contracts/src/moves.ts` |
| Role tier policy | `RoleRoster` + `bindRole` | `kiln/packages/contracts/src/roles.ts` |
| Check | `CheckResult` | `kiln/checks/` |
| Network allowlist | `NetworkAllowlist` | `kiln/checks/network-allowlist.json` |
| Deferred test case | a `CopyRecord` of kind `wait` | `kiln/checks/legacy-copies.json` |

Types are TypeScript (types only — no runtime cost) and are the contract; they are written here as the shapes the implementation must satisfy.

---

## 1. Move kinds and gate ids  (`contracts`)

```ts
/** The closed set (constitution v2.0.1, *The Flow & The Roadmap*). Teams relabel kinds; they never add one. */
export const MOVE_KINDS = [
  "approve", "revise", "reject", "restart", "split+revise", "mitigate",   // feature gates
  "edit-rows", "add-row", "drop-row",                                      // the Roadmap gate's row edits
] as const;
export type MoveKind = (typeof MOVE_KINDS)[number];

/** The internal ids are unchanged from the first program (GATE-1) — only plain names and questions are new. */
export type GateKey =
  | "gate0" | "1-concept" | "2-architecture" | "3-spec" | "4-plan"
  | "5-checkpoint" | "6-review" | "7-verification" | "8-docs" | "9-pr";
export type GateId = "gate0" | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;   // as in the factory-log (G1: gate0 ≠ 1..9)
export const GATE_KEY_OF: Record<GateId, GateKey>;                  // 1 → "1-concept", …

export type FlowVersion = "v1" | "v2";
```

Rules: `mitigate` is **never** a person's move — it appears only in `GateDefinition.automatic`; the row-edit kinds appear only on `gate0`.

## 2. FlowDefinition and GateDefinition  (`contracts`)

```ts
export interface GateDefinition {
  key: GateKey;
  /** The plain name people read. v1 = the first program's names ("architecture", "spec", …); v2 = GATE-1's. */
  name: string;
  /** One question per gate (v2 only; v1 carries none). */
  question?: string;
  phase: "program" | "contract" | "build-and-prove" | "release";
  /** The moves a PERSON may make here — a subset of MOVE_KINDS. */
  moves: readonly MoveKind[];
  /** Automatic kinds the factory may apply before a person decides (Verification: ["mitigate"]). */
  automatic?: readonly MoveKind[];
  /** The judge role for this gate, if any. */
  judge?: string;
  /** Verification only: automatic fix rounds before the gate opens for a person. */
  mitigationCap?: { default: number; min: number; max: number };
}

export interface FlowDefinition {
  version: FlowVersion;
  /** Exactly ten entries, in order: gate0, then 1…9. */
  gates: readonly GateDefinition[];
  roster: RoleRoster;
}
```

**Invariants** (checked by tests, and by `kiln check flow` from r14): ten gates, the Roadmap gate first and Merge last; every `moves`/`automatic`
entry ∈ `MOVE_KINDS`; `gate0` is the only gate with row-edit kinds; the Implementation gate has no `reject`; the judge named on a gate is in the
flow's roster.

### The two versions

| Gate key | v1 name (first program) | v2 name (GATE-1) | v1 moves | v2 moves | v2 judge |
|---|---|---|---|---|---|
| `gate0` | gate0 | Roadmap gate | approve revise reject edit-rows add-row drop-row | **same** | — |
| `1-concept` | concept | Concept | approve revise reject | same | — |
| `2-architecture` | architecture | Design | approve revise reject | same | architecture-critic |
| `3-spec` | spec | Specification | approve revise reject | same | — |
| `4-plan` | plan | Work plan | approve revise reject | same | — |
| `5-checkpoint` | checkpoint | Implementation | approve split+revise | same | — |
| `6-review` | review | Code review | approve restart | **approve revise restart** | code-reviewer |
| `7-verification` | verification | Verification | approve reject (cap 2) | approve reject; automatic `mitigate`; cap default 2, 0–3 | verifier |
| `8-docs` | docs | Documentation | approve revise reject | same | — |
| `9-pr` | pull request | Merge | approve reject | same | — |

**The only move-set difference is `6-review` gaining `revise`; v2's sets are a superset of v1's** (measured — [research.md](./research.md) R6). v1's
roster still names `docs-synthesizer`; v2's does not.

## 3. RoleRoster and the tier policy  (`contracts`)

```ts
export type Tier = "strongest" | "standard" | "cheap" | "per-task";

export interface RoleRoster {
  version: FlowVersion;
  /** Judge roles. v1: architecture-critic, verifier, code-reviewer, docs-synthesizer. v2: architecture-critic, code-reviewer, verifier. */
  judges: readonly string[];
  /** Known producer roles (informational in r12; roles become files in r17). */
  producers: readonly string[];
}

/** A judge — built-in, or declared as one by an added gate — may bind only to "strongest". Throws a named config error otherwise. */
export function bindRole(role: string, tier: Tier, roster: RoleRoster, extraJudges?: readonly string[]): Tier;
export function isJudge(role: string, roster: RoleRoster, extraJudges?: readonly string[]): boolean;
```

**Rule** (WORK-2, constitution II): `isJudge(role) && tier !== "strongest"` → throw `Error("G2/L1 config error: judge role "<role>" cannot bind tier "<tier>"; must be "strongest" (P-II)")` —
the first program's message with "line-of-defense role" now reading "judge role"; the tests assert only on the substrings `G2/L1 config error` and
`must be "strongest"`, which stay. A role that is not a judge under the roster is never refused as a judge violation: under v2, `docs-synthesizer`
binds any tier. (The ported `strongest-model` cases pass the v1 roster as a new third argument — a changed call site, not a changed expectation.)

## 4. Records and the flow field  (`contracts` schema, `record` validators)

The factory-log schema is ported with **one optional addition** — `gate-completion.flow`:

```jsonc
// gate-completion payload (additions in bold in the schema; everything else unchanged)
{ "gate": 6, "move": "revise", "flow": "v2", "cost": {…}, "decidedBy": "human@…" }
```

- `flow` ∈ `{"v1","v2"}`, optional. **Absent ⇒ v1.** Nothing in a committed record is rewritten.
- The validator resolves a record's flow as `record.flow ?? options.defaultFlow ?? "v1"` and checks G3 against `flows[flow].gates[gate].moves`.
- G3's failure message names the flow and lists the allowed moves: `G3 record seq=1 (gate-completion): move "revise" not in MoveVocabulary(gate=6, flow=v1); allowed: approve, restart`.
- State transitions: none. A record's flow never changes after it is written.

## 5. LegacyManifest  (`checks/legacy-manifest.json`)

```ts
export interface LegacyManifest {
  schema: 1;
  baseline: { commit: string; sourcePath: "kiln/"; treeId: string; generatedAt: string };  // the tip of main when r12 started
  /** Globs (relative to legacy/) skipped when looking for additions: the runtime artifacts .gitignore already excludes. */
  ignore: string[];                                                                          // ["factory-log/*.jsonl", "factory-log/*.log"]
  files: { path: string; bytes: number; sha256: string; blobId: string }[];                // paths relative to legacy/, sorted
}
```

**Validation:** `files` is sorted and has unique paths; every `path` exists under `legacy/` (else `legacy-file-missing`); hashes match
(`legacy-file-modified`); no file under `legacy/` outside `ignore` is absent from `files` (`legacy-file-added`) — all of this is pure filesystem.
**Test-only evidence** (needs git history, skips with a printed reason without it): `baseline.treeId` equals `git rev-parse <baseline.commit>:kiln`
(`legacy-baseline-mismatch`).

## 6. CopyRecord  (`checks/legacy-copies.json`)

```ts
export interface CopyRecord {
  legacy: string;                       // path under legacy/, in the manifest
  ported?: string;                      // path under kiln/ — absent for kind "wait"
  kind: "ported" | "wait";              // wait = a legacy item whose row has not ported it yet
  since?: string;                       // commit id of the port (set when the porting commit exists)
  portedBy?: string;                    // for kind "wait": the row that will port it ("r13", "r16")
  retiresWith: "legacy-retirement";     // the duplication ends deliberately
  note?: string;
}
```

**Validation:** `legacy` ∈ manifest; `ported` exists when `kind="ported"`; `portedBy` present when `kind="wait"`; the 19 deferred test cases appear as
`wait` records by file (see [research.md](./research.md) R13); no `ported` path lies under `legacy/`.

## 7. BoundaryRules  (`checks/boundaries.json`)

```ts
export interface BoundaryRules {
  schema: 1;
  /** Each package → the packages it may import (earlier in the PRD §8.2 chain). Siblings are not importable. */
  layers: Record<string, { imports: string[]; builtins?: "none" | "any" }>;   // contracts: builtins "none"
  /** Dependencies that may appear as bare specifiers, per seam. EMPTY in r12 (FR-002). */
  externals: Record<string, { specifiers: string[]; onlyIn: string[] }>;
  /** Nothing under kiln/ may import from here. */
  forbidden: { legacyRoot: "legacy/" };
}
```

**Validation / failure names:** see [contracts/boundaries.md](./contracts/boundaries.md).

## 8. NetworkAllowlist  (`checks/network-allowlist.json`)

```ts
export interface NetworkAllowlist { schema: 1; entries: { path: string; reason: string; loopbackOnly: true }[] }   // path relative to the scan root; entries: [] in r12
```

**Validation:** each `path` contains a `/` (never a bare name) and exists; an entry must pass the loopback-literal assertion (the module refuses
non-loopback hosts) — not exercised until r16 adds the first entry.

## 9. CheckResult  (`checks`)

```ts
export interface CheckResult {
  name: "network" | "boundaries" | "legacy";           // `flow` joins in r14
  ok: boolean;
  failures: { code: string; file?: string; detail: string }[];   // codes are the stable names listed in the contracts
  scanned?: number;                                    // files examined — 0 is itself a failure for network and boundaries
  notes: string[];                                     // e.g. "git unavailable: legacy-file-added check skipped"
}
```

Rendered by the ported `_report` formatter as `PASS` / `FAIL — <code> <file>: <detail>` lines — the first program's report format, so the existing
`*-ready` output conventions carry over.

## 10. PiTierDecision  (`tests/run.ts`)

```ts
export type PiTierDecision =
  | { action: "leave" }                                                    // demanded, absent, measured, or already switched off
  | { action: "switch-off"; installed: string; measured: readonly string[] }; // set KILN_PI=0 for the legacy child, print once

export function decidePiTier(input: {
  env: Record<string, string | undefined>;      // KILN_PI, KILN_PI_BIN
  demanded: boolean;                            // --pi
  installedVersion: string | null;              // from `<pi> --version`, null = no pi
  measured: readonly string[];                  // MEASURED_PI_VERSIONS
}): PiTierDecision;
```

**Rules:** `demanded` or `env.KILN_PI === "1"` → leave; `env.KILN_PI === "0"` → leave (already off); `installedVersion === null` → leave (the legacy gate
skips with its own reason); `measured.includes(installedVersion)` → leave; otherwise → switch-off. Pure; unit-tested with every branch.
