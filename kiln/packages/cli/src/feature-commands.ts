// `kiln feature admit|next|state|move` (r14, contracts/check-flow.md §4): the thin command line over the owner's private channel, for the walk of a feature. Like the gate commands it NEVER opens the
// store: one request, one JSON line out. Exit codes: 0 any ANSWERED request (a refusal is an answer), 2 usage, 3 the owner cannot be reached, 4 outcome unknown (retry the same key / ask again).
// `next` is the only command that waits — on an event the owner raises when a gate opens or the walk ends, never by asking again.
import { readFileSync } from "node:fs";
import { connect } from "#durable/channel/client.ts";
import { channelSocketPath } from "#durable/channel/path.ts";
import { GATE_USAGE } from "./gate-usage.ts";
import { flags, need } from "./cli-flags.ts";

const usage = (why: string): number => {
  console.error(`${why}\n${GATE_USAGE}`);
  return 2;
};

export async function featureCommand(sub: string | undefined, args: string[]): Promise<number> {
  const f = flags(args);
  if ("error" in f) return usage(f.error);
  const wants = sub === "admit" ? ["store", "key", "feature", "walk"] : sub === "next" ? ["store", "feature"] : sub === "state" ? ["store", "feature"] : null;
  if (!wants) return usage(`unknown feature command "${String(sub)}"`);
  const bad = need(f, wants);
  if (bad) return usage(bad);
  let walk: unknown;
  if (sub === "admit") {
    try { walk = JSON.parse(readFileSync(f.walk, "utf8")); } catch (e) { return usage(`--walk: ${(e as Error).message}`); }
  }
  let client;
  try {
    client = await connect(channelSocketPath(f.store));
  } catch (e) {
    console.log(JSON.stringify({ error: "unreachable", detail: (e as Error).message }));
    return 3;
  }
  try {
    const result = sub === "admit" ? await client.admit(f.key, f.feature, walk as never) : sub === "next" ? await client.featureNext(f.feature, f.after) : await client.featureState(f.feature);
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
