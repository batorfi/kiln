// The command ledger (CORE-5, research R4): exactly-once for every command invoked from outside. The effect and the ledger entry are ONE commit, so a command either happened and is
// remembered, or did not happen and is not. Same key + equal request → the first outcome again, nothing written; same key + another request → `key-conflict`, nothing written.
// KEY RETENTION: a command key lives as long as the thing it created exists in the live store (a move key: as long as the gate record, i.e. forever); r15's archive may drop a key only
// together with what it created.
import { plain, requestHash } from "./canonical.ts";
import { appendEvent } from "./record/append.ts";
import type { Services } from "./services.ts";
import type { Tx } from "./store.ts";
import { KEY_MAX, refused, type CommandApi, type CommandOutcome, type JSON, type Key, type Refusal } from "./types.ts";

interface LedgerDoc {
  key?: Key;
  kind?: string;
  requestHash?: string;
  outcome?: JSON;
}

/** Thrown inside an effect to refuse the command: the commit rolls back, nothing is written, and the caller gets this refusal as a VALUE. */
export class Refuse extends Error {
  readonly refusal: Refusal;
  constructor(refusal: Refusal) {
    super(`refused: ${refusal.reason}`);
    this.refusal = refusal;
  }
}

export const validKey = (key: unknown): key is Key => typeof key === "string" && key.trim() !== "" && key.length <= KEY_MAX;

/** `actor` is who issued the command, as the caller knows it (default `system`); it becomes the actor of the `command.accepted` event. */
export async function runCommand<T extends JSON>(s: Services, key: Key, kind: string, request: JSON, effect: (tx: Tx) => Promise<T>, actor = "system"): Promise<CommandOutcome<T>> {
  if (!validKey(key)) return refused("invalid-move", { detail: `a key is a non-empty string of at most ${KEY_MAX} characters` });
  let hash: string;
  try {
    hash = requestHash(kind, request);
  } catch (e) {
    return refused("invalid-move", { detail: `the request is not plain JSON: ${(e as Error).message}` });
  }
  try {
    return await s.store.commit(async (tx): Promise<CommandOutcome<T>> => {
      const entry = await tx.doc<LedgerDoc>("kiln.command", key, {});
      if (entry.requestHash !== undefined) {
        if (entry.requestHash !== hash) throw new Refuse(refused("key-conflict", { original: key }));
        return { status: "repeat", result: plain(entry.outcome) as T };
      }
      const result = await effect(tx);
      entry.key = key;
      entry.kind = kind;
      entry.requestHash = hash;
      entry.outcome = plain(result); // a draft takes ownership of what it is given: hand it a copy, keep the original for the caller
      // r15: an accepted command is a state change (a ledger entry) and is recorded in the commit that makes it. A repeat returns above and writes nothing; a refusal rolls back.
      await appendEvent(tx, { type: "command.accepted", subject: "factory", at: s.now(), actor, cause: key, data: { kind, requestHash: hash } });
      return { status: "applied", result };
    });
  } catch (e) {
    if (e instanceof Refuse) return e.refusal;
    return refused("store-error", { detail: (e as Error).message });
  }
}

export function makeCommandApi(s: Services): CommandApi {
  return { run: (key, kind, request, effect) => runCommand(s, key, kind, request, effect) };
}
