// r16 T026/T027 — a real-role unit's generation never double-charges a tool across a kill (spec US2, SC-002), and a
// hung generation fails by name without ever touching its gate (SC-008). Real `#workers/conversation.ts` (the
// checkpoint's `toolCalls`/`pending` log, the interruption notice), real `write-file`/`read-file` tools writing a
// real file, a SCRIPTED model reply (deterministic, no live Ollama needed — `support/scripted-workers.ts`). The
// weakened control (T027, `support/broken-worker.ts`) proves the proof itself would catch a double-write if the
// replay discipline were missing, not just that the happy path passes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { inspectStore } from "#durable/inspect.ts";
import { checkInvariants } from "./support/oracle.ts";
import { makeStore, runOwner, runThenKill } from "./support/harness.ts";

const LANE_MODULE = fileURLToPath(new URL("../../../lane/src/lane-task.ts", import.meta.url));
const SCRIPTED = fileURLToPath(new URL("./support/scripted-workers.ts", import.meta.url));
const BROKEN = fileURLToPath(new URL("./support/broken-worker.ts", import.meta.url));

function unitSpec(workspace: string) {
  return { label: "worker", steps: 1, needsLane: true, model: "fake-model", role: "worker", workspace, inputs: ["out.txt"] };
}

async function withWorkspace<T>(fn: (workspace: string) => Promise<T>): Promise<T> {
  const dir = mkdtempSync(join(tmpdir(), "k16-worker-replay-"));
  try {
    return await fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

for (const point of ["unit.tool-call-committed", "unit.pre-result-commit"] as const) {
  test(`killed at ${point}: the write-file tool runs exactly once, and the resumed turn is told it already happened`, () =>
    withWorkspace(async (workspace) => {
      const ts = makeStore();
      const workersLog = join(ts.dir, "workers.log");
      try {
        const CREATE = { op: "createTask", key: "u1", kind: "kiln.unit", input: unitSpec(workspace), owner: { kind: "factory" } };
        const dying = await runOwner(ts, {
          laneModule: LANE_MODULE,
          env: { WORKERS_MODULE: SCRIPTED, WORKERS_LOG: workersLog },
          script: [CREATE, { op: "sleep", ms: 15_000 }],
          killAt: point,
          expectDeath: true,
          timeoutMs: 30_000,
        });
        assert.equal(dying.signal, "SIGKILL", `the owner must die by SIGKILL at ${point}; code ${dying.code}\n${dying.stdout()}${dying.stderr()}`);
        assert.deepEqual(ts.killed(), [point], `the kill point ${point} must have FIRED (and only it)`);

        assert.ok(existsSync(join(workspace, "out.txt")), "the write already happened once, in real life, before the kill");
        const afterFirstWrite = { content: readFileSync(join(workspace, "out.txt"), "utf8"), mtimeMs: statSync(join(workspace, "out.txt")).mtimeMs };
        assert.equal(afterFirstWrite.content, "hello from the scripted worker");

        const wreck = await inspectStore(ts.store);
        assert.deepEqual(checkInvariants(wreck), []);

        // restart on the SAME store: the resumed unit must finish, without ever re-running the write
        await runThenKill(ts, { laneModule: LANE_MODULE, env: { WORKERS_MODULE: SCRIPTED, WORKERS_LOG: workersLog }, script: [{ op: "sleep", ms: 2500 }] });

        const afterResume = { content: readFileSync(join(workspace, "out.txt"), "utf8"), mtimeMs: statSync(join(workspace, "out.txt")).mtimeMs };
        assert.equal(afterResume.content, afterFirstWrite.content, `${point}: the file's content changed across the resume — the write ran again`);
        assert.equal(afterResume.mtimeMs, afterFirstWrite.mtimeMs, `${point}: the file's mtime changed across the resume — the write ran again`);

        const done = await inspectStore(ts.store);
        const unit = done.tasks.find((t) => t.kind === "kiln.unit")!;
        assert.equal(unit.status, "terminal");
        assert.deepEqual(unit.outcome, { status: "completed", result: { label: "worker", results: ["write-file: wrote " + join(workspace, "out.txt"), "done"] } });
        assert.deepEqual(checkInvariants(done), []);

        const logged = readFileSync(workersLog, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l) as unknown[]);
        assert.ok(logged.length >= 2, `expected at least 2 logged calls (round0 before the kill, round1 after resume); got ${logged.length}`);
        const resumedCall = logged[logged.length - 1];
        const rendered = JSON.stringify(resumedCall);
        assert.match(rendered, /write-file/, `${point}: the resumed call's context must mention write-file`);
        assert.match(rendered, /ALREADY EXECUTED/, `${point}: the resumed call's context must carry T024's structured interruption notice`);
      } finally {
        ts.cleanup();
      }
    }));
}

test("killed mid-timeout: the step fails by name, releases the lane, and the gate it belongs to is never settled by the clock (SC-008)", () =>
  withWorkspace(async (workspace) => {
    const ts = makeStore();
    try {
      const CREATE = { op: "createTask", key: "u1", kind: "kiln.unit", input: unitSpec(workspace), owner: { kind: "factory" } };
      // a provider that never responds: with a short timeoutMsOverride, the unit must fail BY ITSELF, with no kill at all
      const HANG = fileURLToPath(new URL("./support/hanging-worker.ts", import.meta.url));
      const r = await runOwner(ts, {
        laneModule: LANE_MODULE,
        env: { WORKERS_MODULE: HANG },
        script: [CREATE, { op: "sleep", ms: 3000 }],
        timeoutMs: 20_000,
      });
      assert.equal(r.code, 0, `the owner itself must exit cleanly even though the unit inside it failed\n${r.stdout()}${r.stderr()}`);
      const wreck = await inspectStore(ts.store);
      const unit = wreck.tasks.find((t) => t.kind === "kiln.unit")!;
      assert.equal(unit.status, "terminal");
      assert.equal((unit.outcome as { status: string }).status, "failed", `the timeout must fail the STEP, not settle anything else: ${JSON.stringify(unit.outcome)}`);
      assert.deepEqual(checkInvariants(wreck), []);
    } finally {
      ts.cleanup();
    }
  }));

test("the weakened control (T027): without the real replay discipline, a kill at unit.pre-result-commit DOES double-charge the write — the proof's own technique catches it", () =>
  withWorkspace(async (workspace) => {
    const ts = makeStore();
    try {
      const CREATE = { op: "createTask", key: "u1", kind: "kiln.unit", input: unitSpec(workspace), owner: { kind: "factory" } };
      const dying = await runOwner(ts, {
        laneModule: LANE_MODULE,
        env: { WORKERS_MODULE: BROKEN },
        script: [CREATE, { op: "sleep", ms: 15_000 }],
        killAt: "unit.pre-result-commit",
        expectDeath: true,
        timeoutMs: 30_000,
      });
      assert.equal(dying.signal, "SIGKILL");
      const afterFirstWrite = { content: readFileSync(join(workspace, "out.txt"), "utf8"), mtimeMs: statSync(join(workspace, "out.txt")).mtimeMs };

      await runThenKill(ts, { laneModule: LANE_MODULE, env: { WORKERS_MODULE: BROKEN }, script: [{ op: "sleep", ms: 2500 }] });

      const afterResume = { content: readFileSync(join(workspace, "out.txt"), "utf8"), mtimeMs: statSync(join(workspace, "out.txt")).mtimeMs };
      assert.notEqual(afterResume.mtimeMs, afterFirstWrite.mtimeMs, "the weakened worker (no replay discipline) MUST write the file a second time on resume — if this assertion fails, the control is not weakened and the proof above is not proving anything");
    } finally {
      ts.cleanup();
    }
  }));
