# `kiln.roadmap` — the task that holds the Roadmap gate

> **Status:** [built] as a shell (r13). **Code:** `kiln/packages/durable/src/tasks/roadmap.ts`, input check in `tasks/validate.ts`. **Proof:** `tests/tasks-lifecycle.test.ts` (ROADMAP). **Law:** constitution VI — *the Roadmap gate is human-only, always*. **See also:** [overview](./README.md) · [vocabulary §3](../../../vocabulary.md).

## What it is

Every factory has a **Roadmap gate** (`gate0`): the one place where a person admits the next feature and decides how the factory runs. `kiln.roadmap` is the durable task that *holds* it. It opens gate0, waits for it, and ends with the person's move. It never decides anything.

## Input and creation

```ts
tasks.create(key, "kiln.roadmap", { factory: "demo" }, { kind: "factory" })
```

The input is **exactly** `{ factory }`. Any other field — a `delegation`, an `autoApprove`, anything — is refused *by name* (`invalid-move`: "the Roadmap gate accepts no delegation and no other parameter"). That is how constitution VI is made structural: the type has no delegation field, so there is no path by which a delegation could reach this gate. A test asserts it.

## States

```
 phase "open"                               phase "decide"
 ┌────────────────────────────────┐         ┌───────────────────────────────────────┐
 │ openGate(key "roadmap-gate:<id>")│  park   │ read the move record of the gate     │
 │   gate:<factory>:gate0:<id>      │ ──────▶ │ none?  → fail loudly (never settle)  │
 │   flow v2, brief {kind, factory} │ waiting │ some?  → terminal, completed,        │
 │   openedBy "task:<id>"           │ on gate │   result {gateId, moveKind, key}     │
 └────────────────────────────────┘ task    └───────────────────────────────────────┘
```

1. **`open`** opens the gate through the ordinary gate API, with a key derived from the task's own id (`roadmap-gate:<id>`). The gate id is `gate:<factory>:gate0:<id>`. Then ONE commit parks the task `waiting` on the gate task, recording `{phase:"decide", gateId, gateTaskId}`.
2. **`decide`** runs when the gate task ends. It reads the **stored move record** and completes with its kind and key. If there is no move record it throws: *nothing settles this gate but a person's committed move* — an ended gate task without a move is a bug, not an approval.

## What survives a kill

* **Between "gate opened" and "task parked":** the `open` phase simply re-runs; `openGate` with the same key returns `repeat`, so **there is never a second Roadmap gate**.
* **While waiting (any number of restarts):** the task is `waiting` on the gate task; the gate is waiting on the decision; the decision waits for a move. Restart: all three resume waiting. The test restarts twice with no move and asserts nothing settled.
* **A move with no decider** is `invalid-move` and does not settle it; only `{kind, decidedBy, briefRef}` with the gate's brief reference does. The brief the person decides on is `{kind:"roadmap", factory}`, so its reference is `briefRef({kind:"roadmap",factory})`.

## What it does *not* do (yet)

The shell records the move kind and ends; it does **not** interpret `edit-rows` / `add-row` / `drop-row`, admit a feature, re-open the gate after a merge, or hold the roadmap table as the gate document. Those arrive with the walk (r14) and the director (r18). Gate0's move vocabulary in flow v2 is `approve · revise · reject · edit-rows · add-row · drop-row`.

## Why it is a task and not just "a gate"

So the *factory-level* question has a durable owner. Its gate task is owned by the factory, but the roadmap task is what other tasks (later: the director) will look at to learn "has a person admitted anything?". Its result `{gateId, moveKind, key}` is a pointer to the one stored record, not a copy of a decision.
