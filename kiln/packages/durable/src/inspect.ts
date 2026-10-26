// `inspectStore`: a FRESH reader — no owner, no lock, no Harness — builds the `Inspection` (data-model §7) from the store file alone. The proof judges the wreckage of a kill with this,
// never with the owner's memory (guarantee e). It never resumes anything and never compares versions: a diagnosing reader must be able to read an old store.
import { openReader } from "./library/open.ts";
import type { Reader } from "./store.ts";
import type { Inspection, MoveRecord, StoredOutboxEntry } from "./types.ts";
import type { StoreRecord } from "./store-version.ts";

interface GateDoc { gateId?: string; present?: boolean }
interface MoveDoc { record: MoveRecord | null }
interface OutboxDoc { next: number; entries: StoredOutboxEntry[] }
interface LaneDoc { resident: string | null; hold: boolean; swaps: number; lease: { holder: string; since: number } | null }
interface CommandDoc { key?: string; kind: string; requestHash: string }

export async function inspectStore(store: string, gateId?: string): Promise<Inspection> {
  const reader = await openReader(store);
  try {
    return await inspectWith(reader, gateId);
  } finally {
    await reader.close();
  }
}

export async function inspectWith(reader: Reader, gateId?: string): Promise<Inspection> {
  const rec = await reader.snapshot<StoreRecord>("kiln.store", "main");
  const tasks = await reader.tasks();
  const outbox = (await reader.snapshot<OutboxDoc>("kiln.outbox", "main"))?.entries ?? [];
  const laneDoc = await reader.snapshot<LaneDoc>("kiln.lane", "main");
  const commands: Record<string, string[]> = {};
  for (const c of await reader.docs<CommandDoc>("kiln.command")) (commands[c.key] ??= []).push(c.value.requestHash);

  let gate: Inspection["gate"] = "absent";
  let documents = { gate: false, brief: false, opened: false, moveCommitted: false, gateSettled: false };
  let records: MoveRecord[] = [];
  let decision: Inspection["decision"] = "absent";
  let gateTask: Inspection["gateTask"] = "absent";
  let decisionMatchesRecord = true;
  const timers: string[] = [];
  if (gateId !== undefined) {
    const g = await reader.snapshot<GateDoc & Record<string, unknown>>("kiln.gate", gateId);
    const b = await reader.snapshot<object>("kiln.brief", gateId);
    const m = await reader.snapshot<MoveDoc>("kiln.move", gateId);
    const hasGate = !!g && g.present !== false && g.gateId !== undefined;
    records = m?.record ? [m.record] : [];
    documents = {
      gate: hasGate,
      brief: !!b && Object.keys(b).length > 0,
      opened: outbox.some((e) => e.type === "gate.opened" && e.subject === gateId),
      moveCommitted: outbox.some((e) => e.type === "move.committed" && e.subject === gateId),
      gateSettled: outbox.some((e) => e.type === "gate.settled" && e.subject === gateId),
    };
    const mine = tasks.filter((t) => (t.input as { gateId?: string } | null)?.gateId === gateId);
    const dec = mine.find((t) => t.kind === "kiln.decision");
    decision = !dec ? "absent" : dec.status === "terminal" ? "terminal" : "live";
    const gt = mine.find((t) => t.kind === "kiln.gate");
    gateTask = !gt ? "absent" : gt.status === "terminal" ? "terminal" : "live";
    decisionMatchesRecord = dec?.status === "terminal" ? dec.outcome?.status === "completed" && records.length === 1 && (dec.outcome.result as { key?: string } | null)?.key === records[0].key : true;
    for (const t of mine) if (t.status === "sleeping") timers.push(`${t.kind} sleeping`);
    gate = records.length > 0 ? "settled" : hasGate ? "waiting" : "absent";
  }
  return {
    store: { libraryVersion: rec?.libraryVersion ?? null, contract: rec?.contract ?? null },
    tasks: tasks.map((t) => ({ id: t.id, kind: t.kind, owner: t.owner ?? "factory", status: t.status })),
    gate,
    documents,
    records,
    decision,
    gateTask,
    decisionMatchesRecord,
    timers,
    outbox,
    lane: { holders: laneDoc?.lease ? 1 : 0, resident: laneDoc?.resident ?? null, hold: laneDoc?.hold ?? false, swaps: laneDoc?.swaps ?? 0 },
    commands,
  };
}
