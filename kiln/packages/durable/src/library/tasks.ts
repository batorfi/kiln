// KILN task kinds → the library's task definitions. The mapping is the whole of what a kind can express: phases, a checkpoint, a wait on OTHER TASKS, a terminal outcome, an abort handler.
// There is no sleep and no timer to map to (FR-011), and no way to transition another task.
import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context";
import { ROOT_CONVERSATION_ID, defineTask } from "@earendil-works/pi-durable";
import type { JSON, TaskId } from "../types.ts";
import type { DocName, NextState, OutcomeOf, Owner, Runtime, RunningTask, TaskKind, TaskLite, Tx } from "../store.ts";
import { DOC_TOKENS } from "./docs.ts";

const ctx = BACKGROUND_CONTEXT;
/* eslint-disable @typescript-eslint/no-explicit-any */

export function liteTask(r: any): TaskLite {
  const st = r.state;
  const o = st.outcome;
  return {
    id: r.id,
    kind: r.kind,
    owner: r.owner ?? null,
    input: r.input,
    status: st.status,
    checkpoint: st.checkpoint,
    outcome: o === undefined ? undefined : o.status === "completed" ? { status: "completed", result: o.result } : o.status === "aborted" ? { status: "aborted", reason: o.reason } : { status: "failed", message: String(o.error?.message ?? o.reason ?? o.status) },
    restarts: r.restarts ?? 0,
  };
}

/** KILN's transaction over the library's: documents in the root conversation, tasks by KIND NAME, nothing else. */
/** What the seam adds around every transaction: the factory's hooks, and the wake-up after a commit that appended to the record. */
export interface Seam {
  hooks?: Tx["hooks"];
  onAppended?: () => void;
}
export function wrapTx(libTx: any, byName: Map<string, any>, seam: Seam = {}): Tx & { appended(): boolean } {
  let appended = false;
  return {
    hooks: seam.hooks,
    appended: () => appended,
    doc: (name: DocName, key: string, seed: object) => {
      if (name === "kiln.event") appended = true; // an event is being written in this transaction
      return libTx.doc(DOC_TOKENS[name], ROOT_CONVERSATION_ID, key, seed);
    },
    createTask: async (kind: string, input: JSON, owner: Owner): Promise<TaskId> => {
      const t = byName.get(kind);
      if (!t) throw new Error(`no task kind "${kind}" is registered`);
      return libTx.createTask(t, input, { ownership: owner.kind === "factory" ? { kind: "conversation" } : { kind: "task", taskId: owner.taskId } });
    },
    task: async (id: TaskId) => {
      const r = await libTx.task(id);
      return r ? liteTask(r) : undefined;
    },
  } as Tx;
}

const toLibraryOutcome = <R>(o: OutcomeOf<R>): any => (o.status === "completed" ? { status: "completed", result: o.result } : o.status === "aborted" ? { status: "aborted", reason: o.reason } : { status: "failed", error: { message: o.message } });
const toLibraryNext = <C, R>(n: NextState<C, R>): any =>
  n.status === "running" ? { status: "running", checkpoint: n.checkpoint } : n.status === "waiting" ? { status: "waiting", checkpoint: n.checkpoint, on: n.on, policy: "allSettled" } : { status: "terminal", outcome: toLibraryOutcome(n.outcome) };

function runtimeOf<C, R>(task: any, rt: any, byName: Map<string, any>, seam: Seam): Runtime<C, R> {
  return {
    taskId: task.id,
    signal: rt.signal,
    commit: async (change) => {
      let appended = false;
      await rt.commit(async (libTx: any) => {
        const tx = wrapTx(libTx, byName, seam);
        const next = await change(tx);
        appended = tx.appended();
        return next === undefined || next === null ? undefined : toLibraryNext(next);
      }, ctx);
      if (appended) seam.onAppended?.(); // only after the commit resolved: a rolled-back commit never wakes a consumer
    },
    outcomes: async (ids) => {
      const out = await rt.outcomes(ids, ctx);
      return out.map((o: any) => (o.status === "completed" ? { status: "completed", result: o.result } : o.status === "aborted" ? { status: "aborted", reason: o.reason } : { status: "failed", message: String(o.error?.message ?? o.status) }));
    },
  };
}

/** Map one KILN kind to the library's task; `byName` is filled by the caller with every mapped kind (so a kind can create children by name). */
export function toLibraryTask<I, C extends { phase: string }, R>(kind: TaskKind<I, C, R>, byName: Map<string, any>, seam: Seam = {}): any {
  const running = (t: any): RunningTask<I, any> => ({ id: t.id, input: t.input as I, checkpoint: t.state.checkpoint });
  const phases: Record<string, any> = {};
  for (const [phase, handler] of Object.entries(kind.phases) as [string, (t: RunningTask<I, any>, r: Runtime<C, R>) => Promise<void>][]) {
    phases[phase] = (task: any, rt: any) => handler(running(task), runtimeOf<C, R>(task, rt, byName, seam));
  }
  return defineTask<any, any, any>({
    name: kind.name,
    version: kind.version,
    initial: (input: I) => kind.initial(input),
    phases,
    abort: (task: any, rt: any) => kind.abort(running(task), runtimeOf<C, R>(task, rt, byName, seam)),
  });
}
