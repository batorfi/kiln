// `validateEvent`: every rule an event must meet to be committed (research R5, contracts/event-catalog.md §1). Pure: the same event gives the same faults. `durable` calls it inside the commit
// (a fault throws and rolls the commit back); `kiln check record` and the stream validators call it on stored events. Faults are values: a code, a path, a message.
import { catalog } from "#contracts/events/catalog/index.ts";
import { findForbiddenKey, isActor, isCausation } from "#contracts/events/grammar.ts";
import { validate } from "../validate-core.ts";

export interface EventFault {
  code:
    | "event-shape-invalid" | "event-type-unknown" | "event-version-unknown" | "event-field-forbidden" | "event-data-invalid"
    | "event-actor-invalid" | "event-cause-missing" | "event-cause-dangling" | "event-subject-invalid" | "event-time-invalid";
  path?: string;
  message: string;
}

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const SUBJECT = /^[a-z0-9][a-z0-9:._-]{0,159}$/; // a gate id, a feature name, "lane" or "factory" (the gate id pattern of r13)
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export function validateEvent(e: unknown): EventFault[] {
  const faults: EventFault[] = [];
  if (!isObj(e)) return [{ code: "event-shape-invalid", message: "an event is an object" }];
  for (const k of ["type", "schema", "subject", "actor", "causation", "time", "privacy", "id"] as const) {
    if (typeof e[k] !== "string") faults.push({ code: "event-shape-invalid", path: k, message: `${k} is a string` });
  }
  if (!Number.isInteger(e.seq) || (e.seq as number) < 1) faults.push({ code: "event-shape-invalid", path: "seq", message: "seq is an integer from 1" });
  if (e.correlation !== null && typeof e.correlation !== "string") faults.push({ code: "event-shape-invalid", path: "correlation", message: "correlation is a string or null" });
  if (e.trace !== null && typeof e.trace !== "string") faults.push({ code: "event-shape-invalid", path: "trace", message: "trace is a string or null" });
  if (!("data" in e)) faults.push({ code: "event-shape-invalid", path: "data", message: "data is present" });
  if (faults.length) return faults;

  const entry = catalog.get(e.type as string);
  if (!entry) return [{ code: "event-type-unknown", path: "type", message: `"${e.type}" is not in the catalog` }];
  if (e.schema !== `${entry.type}/${entry.current}`) {
    faults.push({ code: "event-version-unknown", path: "schema", message: `"${e.schema}" is not the current version of ${entry.type} (${entry.type}/${entry.current})` });
  } else {
    const forbidden = findForbiddenKey(e.data);
    if (forbidden) faults.push({ code: "event-field-forbidden", path: forbidden.path, message: `"${forbidden.key}" may never appear in an event: facts and references only` });
    else for (const err of validate(e.data, entry.versions[entry.current])) faults.push({ code: "event-data-invalid", path: err.path.replace(/^\$/, "data"), message: err.message });
  }

  if (!isActor(e.actor)) faults.push({ code: "event-actor-invalid", path: "actor", message: `"${e.actor}" is not an actor (human@…, director, system, factory, task:<n>, role:<r>@<m>, delegation:<ref>, script:<name>)` });
  if (e.causation === "") faults.push({ code: "event-cause-missing", path: "causation", message: "an event has a cause" });
  else if (!isCausation(e.causation)) faults.push({ code: "event-cause-missing", path: "causation", message: `"${e.causation}" is neither cmd:<key> nor evt:<seq>` });
  else if ((e.causation as string).startsWith("evt:") && Number((e.causation as string).slice(4)) >= (e.seq as number)) {
    faults.push({ code: "event-cause-dangling", path: "causation", message: `${e.causation} does not name an earlier event (this one is ${e.seq})` });
  }
  if (!SUBJECT.test(e.subject as string)) {
    faults.push({ code: "event-subject-invalid", path: "subject", message: `"${e.subject}" is not a subject (a gate id, a feature name, "lane" or "factory")` });
  }
  if (!ISO.test(e.time as string) || Number.isNaN(Date.parse(e.time as string))) faults.push({ code: "event-time-invalid", path: "time", message: `"${e.time}" is not an ISO-8601 UTC instant` });
  return faults;
}
