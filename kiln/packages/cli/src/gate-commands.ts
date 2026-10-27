// `kiln owner` and `kiln gate open|move|state` (FR-046, contracts/owner-channel.md): the thin command line over the owner's private local channel. A completer NEVER opens the store: every gate
// command is one request to the owner and one JSON line out. Exit codes: 0 any ANSWERED request (a refusal is an answer), 2 usage, 3 the owner cannot be reached, 4 outcome unknown (retry the same key).
// The CLI imports three modules of the durable package: the owner runner, the channel client and the pure socket-path arithmetic (a completer uses only the last two).
import { readFileSync } from "node:fs";
import { connect } from "#durable/channel/client.ts";
import { channelSocketPath } from "#durable/channel/path.ts";
import { startOwner } from "#durable/owner.ts";
import { GATE_USAGE } from "./gate-usage.ts";

function flags(args: string[]): Record<string, string> | { error: string } {
  const out: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 2) {
    const a = args[i];
    if (!a.startsWith("--") || args[i + 1] === undefined) return { error: `bad argument "${a}"` };
    out[a.slice(2)] = args[i + 1];
  }
  return out;
}
const need = (f: Record<string, string>, names: string[]): string | null => {
  const missing = names.filter((n) => f[n] === undefined);
  return missing.length ? `missing ${missing.map((n) => `--${n}`).join(", ")}` : null;
};

/** `kiln owner --store <dir>`: runs until SIGTERM/SIGINT. Prints `listening`, then `ready`. */
export async function ownerCommand(args: string[]): Promise<number> {
  const f = flags(args);
  if ("error" in f || need(f, ["store"])) return usage("error" in f ? f.error : need(f, ["store"])!);
  let owner;
  try {
    owner = await startOwner({ store: f.store });
  } catch (e) {
    console.error(`${(e as Error).name}: ${(e as Error).message}`);
    return 1;
  }
  // the stop handlers are in place BEFORE anything is announced: whoever reads "ready" may signal at once, and a signal that arrives first would kill the owner without a clean close
  let stopFailed = false;
  const stopped = new Promise<void>((resolve) => {
    const stop = (): void => void owner.stop().catch((e) => { console.error(`stop failed: ${(e as Error).message}`); stopFailed = true; }).finally(resolve);
    process.once("SIGTERM", stop);
    process.once("SIGINT", stop);
  });
  console.log("listening");
  try {
    await owner.ready;
  } catch (e) {
    console.error(`not ready: ${(e as Error).message}`);
    await owner.stop();
    return 1;
  }
  console.log("ready");
  await stopped;
  return stopFailed ? 1 : 0;
}

export async function gateCommand(sub: string | undefined, args: string[]): Promise<number> {
  const f = flags(args);
  if ("error" in f) return usage(f.error);
  const wants = sub === "open" ? ["store", "key", "gate", "gate-key", "flow", "brief"] : sub === "move" ? ["store", "gate", "key", "kind", "by", "brief-ref"] : sub === "state" ? ["store", "gate"] : null;
  if (!wants) return usage(`unknown gate command "${String(sub)}"`);
  const bad = need(f, wants);
  if (bad) return usage(bad);
  // a malformed --admit file is a usage error: it is found BEFORE any connection, so nothing is sent
  let admit: unknown;
  if (sub === "move" && f.admit !== undefined) {
    try { admit = JSON.parse(readFileSync(f.admit, "utf8")); } catch (e) { return usage(`--admit: ${(e as Error).message}`); }
  }
  let client;
  try {
    client = await connect(channelSocketPath(f.store));
  } catch (e) {
    console.log(JSON.stringify({ error: "unreachable", detail: (e as Error).message }));
    return 3;
  }
  try {
    let result: unknown;
    if (sub === "open") {
      let brief: unknown;
      try { brief = JSON.parse(readFileSync(f.brief, "utf8")); } catch (e) { return usage(`--brief: ${(e as Error).message}`); }
      // r14: `--returns-to a,b` opens the gate with the walk's move semantics (a note on every corrective move; the listed places a reject may name). Without it the gate is r13's.
      const returnsTo = f["returns-to"] === undefined ? undefined : f["returns-to"].split(",").filter((x) => x !== "");
      result = await client.open(f.key, { gateId: f.gate, gateKey: f["gate-key"] as never, flow: f.flow as never, brief: brief as never, openedBy: f.by ?? "cli", ...(returnsTo ? { returnsTo: returnsTo as never } : {}) });
    } else if (sub === "move") {
      // r14: the optional fields of a move. The owner judges them (by name); the command line only carries them (`admit` was read above, before connecting).
      result = await client.submit(f.gate, f.key, {
        kind: f.kind as never, decidedBy: f.by, briefRef: f["brief-ref"],
        ...(f.note !== undefined ? { note: f.note } : {}), ...(f.target !== undefined ? { target: f.target as never } : {}), ...(admit !== undefined ? { admit: admit as never } : {}),
      });
    }
    else result = await client.state(f.gate);
    console.log(JSON.stringify(result));
    const unknown = (result as { status?: string; reason?: string; detail?: string })?.reason === "store-error" && ["connection-lost", "timeout"].includes((result as { detail?: string }).detail ?? "");
    return unknown ? 4 : 0;
  } catch (e) {
    console.log(JSON.stringify({ error: "outcome-unknown", detail: (e as Error).message }));
    return 4;
  } finally {
    client.close();
  }
}

function usage(why: string): number {
  console.error(`${why}\n${GATE_USAGE}`);
  return 2;
}
