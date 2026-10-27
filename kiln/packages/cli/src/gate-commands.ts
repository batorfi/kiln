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
  const stopped = new Promise<void>((resolve) => {
    const stop = (): void => void owner.stop().finally(resolve);
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
  return 0;
}

export async function gateCommand(sub: string | undefined, args: string[]): Promise<number> {
  const f = flags(args);
  if ("error" in f) return usage(f.error);
  const wants = sub === "open" ? ["store", "key", "gate", "gate-key", "flow", "brief"] : sub === "move" ? ["store", "gate", "key", "kind", "by", "brief-ref"] : sub === "state" ? ["store", "gate"] : null;
  if (!wants) return usage(`unknown gate command "${String(sub)}"`);
  const bad = need(f, wants);
  if (bad) return usage(bad);
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
      result = await client.open(f.key, { gateId: f.gate, gateKey: f["gate-key"] as never, flow: f.flow as never, brief: brief as never, openedBy: f.by ?? "cli" });
    } else if (sub === "move") result = await client.submit(f.gate, f.key, { kind: f.kind as never, decidedBy: f.by, briefRef: f["brief-ref"] });
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
