// THROWAWAY spike extension (T011). Observes what session changes do to an extension: does the factory run again, does module state survive,
// do session_start / session_shutdown fire, and what happens to a dialog left open across a session switch. Not part of KILN.
import { appendFileSync } from "node:fs";
const g = globalThis as any;
let moduleCounter = 0; // module-level state: does it survive?
export default function (pi: any) {
  const log = (o: object) => appendFileSync(process.env.KP_LOG as string, JSON.stringify({ t: Date.now(), ...o }) + "\n");
  g.__kilnFactoryRuns = (g.__kilnFactoryRuns ?? 0) + 1;
  log({ event: "factory", factoryRuns: g.__kilnFactoryRuns, moduleCounter });
  pi.on("session_start", async (e: any) => log({ event: "session_start", reason: e?.reason }));
  pi.on("session_shutdown", async () => log({ event: "session_shutdown" }));
  pi.registerCommand("l-ping", { description: "ping", handler: async (_a: string, ctx: any) => { moduleCounter++; log({ event: "ping", moduleCounter, mode: ctx.mode }); } });
  pi.registerCommand("l-ask", {
    description: "ask",
    handler: async (_a: string, ctx: any) => {
      log({ event: "ask-open" });
      const v = await ctx.ui.select("Gate?", ["approve", "reject"]);
      log({ event: "ask-result", value: v === undefined ? "undefined" : v });
    },
  });
}
