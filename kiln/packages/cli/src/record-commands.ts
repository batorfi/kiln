// `kiln record show|status|verify|rebuild-log` (r15, contracts/backbone-and-projection.md §5): the record read from outside, offline, through a fresh reader — never an owner. Exit codes as the other
// commands: 0 answered, 1 a verification that failed (or examined nothing), 2 usage, 3 the store cannot be read.
import { writeFileSync } from "node:fs";
import { rebuildLog, recordStatus, showRecord, verifyRecord } from "#durable/record/tools.ts";
import { GATE_USAGE } from "./gate-usage.ts";
import { flags, need } from "./cli-flags.ts";

const usage = (why: string): number => {
  console.error(`${why}\n${GATE_USAGE}`);
  return 2;
};
const int = (v: string | undefined): number | undefined => (v === undefined ? undefined : Number(v));

export async function recordCommand(sub: string | undefined, args: string[]): Promise<number> {
  const f = flags(args);
  if ("error" in f) return usage(f.error);
  const wants = sub === "show" || sub === "status" || sub === "verify" ? ["store"] : sub === "rebuild-log" ? ["store", "run"] : null;
  if (!wants) return usage(`unknown record command "${String(sub)}"`);
  const bad = need(f, wants);
  if (bad) return usage(bad);
  for (const k of ["from", "to"]) if (f[k] !== undefined && !Number.isInteger(Number(f[k]))) return usage(`--${k} is an integer`);
  try {
    if (sub === "show") {
      for (const e of await showRecord(f.store, { run: f.run, from: int(f.from), to: int(f.to) })) console.log(JSON.stringify(e));
      return 0;
    }
    if (sub === "status") {
      console.log(JSON.stringify(await recordStatus(f.store)));
      return 0;
    }
    if (sub === "verify") {
      const v = await verifyRecord(f.store, f.run);
      if (v.ok) console.log(`PASS record — examined: ${v.examined} events${f.run ? ` of run ${f.run}` : ""}, reached seq ${v.reached}`);
      else {
        console.log(`FAIL record — ${v.faults.length || 1} fault${v.faults.length === 1 ? "" : "s"}, examined: ${v.examined} events, reached seq ${v.reached}`);
        if (v.examined === 0 && v.faults.length === 0) console.log("  record-vacuous: the record has no events: a check that examined nothing proves nothing");
        for (const x of v.faults) console.log(`  ${x}`);
      }
      return v.ok ? 0 : 1;
    }
    const r = await rebuildLog(f.store, f.run);
    if (f.out) {
      writeFileSync(f.out, r.text);
      console.log(JSON.stringify({ run: f.run, lines: r.lines, events: r.events, out: f.out }));
    } else process.stdout.write(r.text);
    return 0;
  } catch (e) {
    console.log(JSON.stringify({ error: "unreadable", detail: (e as Error).message }));
    return 3;
  }
}
