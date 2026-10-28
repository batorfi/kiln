// The stream rules (contracts/backbone-and-projection.md §4, FR-043): what a SEQUENCE of events must satisfy, as opposed to what each event must satisfy alone (`validateEvent`). Pure: events in,
// faults out, never a throw. NEVER VACUOUS: a stream of no events is itself a fault. `whole` says the stream is the whole record (or a whole old walk), so its numbering must be 1…N with no gap;
// a single run read out of a larger record is not.
import { flowOf } from "#contracts/flow/index.ts";
import { findForbiddenKey } from "#contracts/events/grammar.ts";
import type { Event } from "#contracts/events/types.ts";
import type { FlowVersion } from "#contracts/moves.ts";

export interface StreamFault {
  code: "record-vacuous" | "stream-gap" | "time-backwards" | "stream-silent-approval" | "stream-delegation-merged" | "stream-content-key" | "stream-move-not-in-vocabulary" | "causation-chain-broken";
  seq?: number;
  detail: string;
}
export interface StreamResult {
  /** How many events were examined: a check that examined none says so and fails. */
  examined: number;
  faults: StreamFault[];
}
export interface StreamOptions {
  /** The stream is the whole record: numbering must start at 1 and have no gap. Default true. */
  whole?: boolean;
  /** The flow a gate's moves are judged against when the stream does not say (`gate.opened` carries it). The first program's streams are v1. */
  flow?: FlowVersion;
}

const APPROVING = new Set(["approve", "restart", "merge"]);
const HUMAN = /^human@/;
const gateKeyOf = (subject: string): string | undefined => /^gate:[^:]+:([^:]+):[0-9]+$/.exec(subject)?.[1];

export function checkStream(events: readonly Event[], opts: StreamOptions = {}): StreamResult {
  const faults: StreamFault[] = [];
  const add = (code: StreamFault["code"], detail: string, seq?: number): void => void faults.push({ code, detail, ...(seq !== undefined ? { seq } : {}) });
  if (events.length === 0) {
    add("record-vacuous", "the stream has no events: a check that examined nothing proves nothing");
    return { examined: 0, faults };
  }
  const whole = opts.whole !== false;
  const flowOfGate = new Map<string, FlowVersion>();
  const armedFor = new Set<string>();
  const seen = new Set<number>();
  let prevTime = -Infinity;

  events.forEach((e, i) => {
    if (whole) {
      const want = i === 0 ? 1 : events[i - 1].seq + 1;
      if (e.seq !== want) add("stream-gap", `event ${i + 1} has seq ${e.seq}; the whole record numbers 1…N with no gap or repeat (expected ${want})`, e.seq);
    }
    const t = Date.parse(e.time);
    if (t < prevTime) add("time-backwards", `${e.type} #${e.seq} is at ${e.time}, earlier than the event before it`, e.seq);
    prevTime = Math.max(prevTime, t);

    const forbidden = findForbiddenKey(e.data);
    if (forbidden) add("stream-content-key", `${e.type} #${e.seq} carries "${forbidden.key}" at ${forbidden.path}: facts and references only`, e.seq);

    if (e.causation.startsWith("evt:")) {
      const n = Number(e.causation.slice(4));
      if (!(n < e.seq) || (whole && !seen.has(n))) add("causation-chain-broken", `${e.type} #${e.seq} is caused by ${e.causation}, which is not an earlier event of the stream`, e.seq);
    }
    seen.add(e.seq);

    const d = e.data as Record<string, unknown>;
    if (e.type === "gate.opened" && (d.flow === "v1" || d.flow === "v2")) flowOfGate.set(e.subject, d.flow);
    if (e.type === "delegation.armed") armedFor.add(String(d.of));

    if (e.type === "move.committed") {
      if (/^delegation:/.test(e.actor) || /^delegation:/.test(String(d.decidedBy))) add("stream-delegation-merged", `move.committed #${e.seq} is decided by a delegation: a delegation is its own event (delegation.armed), never a person's move`, e.seq);
      const key = gateKeyOf(e.subject);
      if (key && typeof d.kind === "string" && d.scope !== "feature") {
        const flow = flowOfGate.get(e.subject) ?? opts.flow ?? "v2";
        const gate = flowOf(flow).gates.find((g) => g.key === key);
        if (gate && !(gate.moves as readonly string[]).includes(d.kind)) add("stream-move-not-in-vocabulary", `move.committed #${e.seq}: "${d.kind}" is not a move of ${key} in flow ${flow} (allowed: ${gate.moves.join(", ")})`, e.seq);
      }
    }
    if (e.type === "gate.settled" && typeof d.move === "string" && APPROVING.has(d.move)) {
      const human = HUMAN.test(String(d.decidedBy));
      const delegated = armedFor.has(e.subject) || armedFor.has(gateKeyOf(e.subject) ?? "\0");
      if (!human && !delegated) add("stream-silent-approval", `gate.settled #${e.seq} (${d.move}) is decided by "${d.decidedBy}": not a human@… and no delegation.armed names the gate`, e.seq);
    }
  });
  return { examined: events.length, faults };
}
