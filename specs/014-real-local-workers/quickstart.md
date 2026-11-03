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
export DIR=$(mktemp -d); mkdir -p "$DIR/ws"; export S="$DIR/s"
node -e "const fs=require('fs'); const fx=JSON.parse(fs.readFileSync('fixtures/walk-real-worker.json','utf8')); fx.script.real.workspace='$DIR/ws'; fs.writeFileSync('$DIR/walk.json', JSON.stringify(fx));"
node packages/cli/src/main.ts owner --store "$S" &                       # prints: listening … ready
node packages/cli/src/main.ts feature admit --store "$S" --key a1 --feature demo --walk "$DIR/walk.json"
node packages/cli/src/main.ts feature state --store "$S" --feature demo
```

Expected: `feature admit` returns `{"status":"created", ...}`. Reading the record (`kiln record show --store "$S" --run demo`) shows a real `lane.acquired` with `"model":"gemma4:12b"` and, once the step finishes, `unit.settled` holding a real result — not the scripted stand-in's `label:i` string. `ollama ps` (run separately, by hand) shows the pinned model resident for the duration — loaded by the residency manager, not by this command.

## 2. A judge never binds weaker than the strongest resident model (US4)

```sh
node tests/run.ts packages/workers/tests/judge-tier-refusal.test.ts packages/lane/tests/judge-no-fallback.test.ts
```

Expected: a judge role bound to anything but `strongest` is refused by `bindConversationRole` before any `pi-ai` call (a spy on the request path never fires); a judge's residency failure never substitutes a different, already-resident model — only a retry of the *same* model lets the step proceed.

## 3. A crash mid-generation never double-charges a tool (US2)

```sh
node tests/run.ts --proof packages/durable/tests/proof/worker-replay.proof.test.ts
```

Kills the owner right after a real `write-file` tool call commits but before the step's result does; restarts on the same store. Expected: the write ran **exactly once** (the test asserts the file's content and mtime are unchanged by the resume), and the resumed conversation's first turn carries the structured interruption notice naming `write-file` as already executed. The same file's last test proves the proof itself is not vacuous: a weakened worker with no replay discipline genuinely double-writes when killed at the same point.

## 4. A model loaded outside KILN is a broken guarantee (US3)

```sh
node tests/run.ts packages/lane/tests/lane-task-residency.test.ts packages/lane/tests/residency.test.ts
```

Expected: a model present in Ollama's running list that the residency manager never asked to load causes the **next** acquire to refuse, naming the mismatch — never silently adopted as the new resident; a legitimate restart (the model the process is about to re-request, left resident by Ollama's own `keep_alive:-1`) is correctly *not* flagged. There is no separate "broken-guarantee" committed event (FR-027/SC-004, corrected during implementation) — the refusal itself, via the existing `LaneError` path, is the detection.

## 5. A hung generation times out; the gate it belongs to never settles on its own (Clarification 1, US2 acceptance scenario 5)

```sh
node tests/run.ts --proof packages/durable/tests/proof/worker-replay.proof.test.ts   # same file as §3 — includes the mid-timeout case
```

Expected: the step fails by name (`unit.failed`) within its tier's configured `timeoutMs`; the lane lease is released; the gate the step belonged to is still waiting afterward — only a person's later move settles it.

## 6. Readiness probes catch a missing capability before a step runs (US5)

```sh
node tests/run.ts packages/workers/tests/conversation.test.ts packages/lane/tests/residency.test.ts
```

Expected: a role needing tool calling bound to a model whose probe reports that capability absent is refused here, by name, before any `pi-ai` call — never discovered by the conversation failing partway through; the probe is re-run fresh on every call, never cached, so a model removed between two rounds of one step is caught at the next round's own request.

## 7. The full real walk, with real workers and real judges (US6 — the row's own acceptance line)

```sh
export DIR=$(mktemp -d); mkdir -p "$DIR/ws"; export S="$DIR/s"
node -e "const fs=require('fs'); const fx=JSON.parse(fs.readFileSync('fixtures/walk-real-worker.json','utf8')); fx.script.real.workspace='$DIR/ws'; fs.writeFileSync('$DIR/walk.json', JSON.stringify(fx));"
node packages/cli/src/main.ts owner --store "$S" &
node packages/cli/src/main.ts feature admit --store "$S" --key a1 --feature demo --walk "$DIR/walk.json"
node tests/walk/drive.ts --store "$S" --feature demo --script fixtures/walk-interface.approve-all.json --by human@quickstart
node packages/cli/src/main.ts record rebuild-log --store "$S" --run demo --out /tmp/rebuilt.jsonl
cmp /tmp/rebuilt.jsonl "$S"/projections/factory-log/demo.jsonl && echo BYTE-IDENTICAL
```

Expected: `drive.ts` prints one `{"gate":...,"move":"approve","status":"committed"}` line per gate, ten gates, ending `{"done":true,"status":"done","gates":10}` — the walk reaching Merge with every author/judge step a real conversation, a person deciding every gate from the CLI (here, a script standing in as the decider, exactly as r14's own driver was always built to do — a real person uses the same `kiln gate move` command by hand), and the rebuilt factory-log byte-identical to the live one. Measured on this host: ~185–215s.

## 8. The proof (SC-002, SC-003, SC-004, SC-005, SC-006, SC-008)

```sh
npm run proof -- packages/durable/tests/proof/worker-replay.proof.test.ts packages/durable/tests/proof/real-worker-walk-kill.proof.test.ts
```

The kill-point matrix over a real generation (tool-call commit, pre-result commit, mid-timeout, and — inside a full multi-gate walk, not just one unit — a kill mid-generation that still reaches Merge after restart), judged by a fresh reader; includes the weakened-control variant (a worker that silently re-sends a logged write) shown to be caught. Measured on this host: ~215s for the full-walk kill case alone.

## 9. Everything else still holds

`npm test` (default tier, both scripted and the fixtures above) and `npm run check` (five checks, plus the extended boundary rules — `workers` is the only importer of `pi-ai`'s request surface; `cli` is the only package allowed to import both `lane` and `workers`). `git diff main -- legacy` is empty; `specs/ROADMAP.md` is unchanged by the build.

## When Ollama isn't installed

Every command above that needs a running model prints a skip with a named reason (the same convention `legacy`'s live-Pi suite and `npm run ollama-ready` already use) rather than failing silently or passing without running. `npm test` (default tier, no `--live`) never requires Ollama for the tests that don't touch a real role.

## A note on timing under load

Real LLM inference is the most load-sensitive thing this row's tests do. Run alone, every scenario above completes within the times stated; run concurrently with other heavy work on the same host (another real walk, several mutation checks, a second Node version's own test run), several live-model tests can legitimately take minutes rather than seconds and may hit their own test-level timeout — this is a known, load-dependent property of real generation, not a defect (see `implementation-report.md` §8).
