# Quickstart: the acceptance run (row r16)

Prerequisites: `cd kiln && npm ci` (Node `^22.19.0 || >=24.1.0`); `npm test` and `npm run proof` green on the base (r15's state). [Ollama](https://ollama.com) installed and running (`ollama serve`), with the pinned default model pulled:

```sh
export KILN_LIVE_MODEL=${KILN_LIVE_MODEL:-gemma4:12b}     # legacy's convention (Clarification 2), overridable
ollama pull "$KILN_LIVE_MODEL"
ollama list | grep -q "$KILN_LIVE_MODEL" && echo "model present"
```

Every command below reaches only `127.0.0.1:11434` (Ollama) beyond r13's own private owner socket — no other egress (constitution VIII).

## 1. A real conversation replaces the scripted stand-in (US1)

```sh
export S=$(mktemp -d)/store
node packages/cli/src/main.ts owner --store $S &                      # prints: listening … ready
node packages/cli/src/main.ts feature admit --store $S --key a1 --feature demo --script fixtures/walk-real-worker.json   # NEW fixture: one unit, role "worker", real: true
node packages/cli/src/main.ts feature state --store $S --feature demo --watch
```

Expected: the unit's `unit.started`/`unit.settled` events bracket a real elapsed time (seconds, not the scripted `stepMs`), and `record show --run demo` shows a real result in place of the stand-in's `label:i` string. `ollama ps` (run separately, by hand) shows the pinned model resident for the duration — loaded by the residency manager, not by this command.

## 2. A judge never binds weaker than the strongest resident model (US4)

```sh
node tests/run.ts packages/workers/tests/judge-tier-refusal.test.ts
```

Expected: a judge role bound to anything but `strongest` is refused by `bindConversationRole` before any `pi-ai` call; making the strongest model briefly unavailable (stop Ollama, or rename the pulled model) makes the judged step **wait**, naming the reason — it is never served by a different, resident model.

## 3. A crash mid-generation never double-charges a tool (US2)

```sh
node tests/run.ts --proof packages/workers/tests/replay-discipline.test.ts
```

Scripts a worker step that calls `write-file` then kills the owner right after the tool executes but before the step's result commits. Expected: after restart, the write ran **exactly once** (the test asserts the file's content and mtime are unchanged by the resume), and the resumed conversation's first turn contains the structured interruption notice naming `write-file` as already executed (grep the recorded conversation transcript for the exact tool name and arguments logged in the checkpoint before the kill).

## 4. A model loaded outside KILN is a broken guarantee (US3)

```sh
curl -s http://127.0.0.1:11434/api/generate -d '{"model":"'"$KILN_LIVE_MODEL"'","prompt":"hi","stream":false}' > /dev/null   # loads the model OUTSIDE the residency manager's path
node packages/cli/src/main.ts health check --store $S          # or: node tests/run.ts packages/lane/tests/residency-reconcile.test.ts
```

Expected: the mismatch is detected and reported by name (a broken-guarantee event, OBS-5) — never silently adopted as the new resident.

## 5. A hung generation times out; the gate it belongs to never settles on its own (Clarification 1, US2 acceptance scenario 5)

```sh
node tests/run.ts --proof packages/workers/tests/timeout.test.ts   # a fake provider that never responds; asserts unit.failed, lane released, gate still open
```

Expected: the step fails by name within its tier's configured `timeoutMs`; the lane lease is released; the gate the step belonged to is still `waiting` afterward — only a person's later move settles it.

## 6. Readiness probes catch a missing capability before a step runs (US5)

```sh
node packages/cli/src/main.ts check models --store $S           # or: node tests/run.ts packages/lane/tests/readiness-probe.test.ts
```

Expected: a model lacking tool-calling support (point the probe at a model known not to support it, or a faux provider that never returns a tool call) is refused for a role that needs tool calling, by name, before any step is scheduled on it.

## 7. The full scripted walk, with real workers and real judges (US6 — the row's own acceptance line)

```sh
node tests/walk/drive.ts --store $S --feature demo --walk fixtures/walk-small-interface.json --real --by human@r16-script
node packages/cli/src/main.ts record rebuild-log --store $S --run demo --out /tmp/rebuilt.jsonl
cmp /tmp/rebuilt.jsonl $S/projections/factory-log/demo.jsonl && echo BYTE-IDENTICAL
```

Expected: the walk reaches Merge with every worker and judge step a real conversation (0 `stepMs` stand-ins used — grep the record for any unit whose checkpoint lacks a `toolCalls` field where the fixture named a real role), a person deciding every gate from the CLI, and the record's shape indistinguishable from a scripted walk's except for real `lane.*`/`unit.*` content.

## 8. The proof (SC-002, SC-003, SC-004, SC-005, SC-006, SC-008)

`npm run proof -- packages/workers packages/lane` — the kill-point matrix over a real generation (tool-call commit, pre-result commit, mid-timeout), judged by a fresh reader; includes the weakened-control variants (a provider that silently re-sends a logged write; a residency manager that trusts the document without reconciling) each shown to be caught.

## 9. Everything else still holds

`npm test` (default tier, both scripted and the fixtures above) and `npm run check` (five checks, plus the extended boundary rule — `workers` is the only importer of `pi-ai`'s request surface). `git diff main -- legacy` is empty; `specs/ROADMAP.md` is unchanged by the build.

## When Ollama isn't installed

Every command above that needs a running model prints a skip with a named reason (the same convention `legacy`'s live-Pi suite and `npm run ollama-ready` already use) rather than failing silently or passing without running. `npm test` (default tier, no `--live`) never requires Ollama.
