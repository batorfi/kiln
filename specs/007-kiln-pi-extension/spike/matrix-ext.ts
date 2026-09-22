// THROWAWAY spike extension (T009). Logs what each ctx.ui call RETURNS, in whichever mode Pi runs. Not part of KILN.
import { appendFileSync } from "node:fs";
export default function (pi: any) {
  const log = (o: object) => appendFileSync(process.env.KP_LOG as string, JSON.stringify(o) + "\n");
  const cmd = (name: string, fn: (ctx: any) => any) =>
    pi.registerCommand(name, {
      description: name,
      handler: async (_a: string, ctx: any) => {
        const t0 = Date.now();
        let result: unknown, err: string | undefined;
        try { result = await fn(ctx); } catch (e: any) { err = String(e?.message ?? e); }
        log({ cmd: name, mode: ctx.mode, hasUI: ctx.hasUI, result: result === undefined ? "undefined" : result, err, ms: Date.now() - t0 });
      },
    });
  cmd("m-select", (c) => c.ui.select("Pick", ["a", "b"]));
  cmd("m-select-t", (c) => c.ui.select("Pick", ["a", "b"], { timeout: 1500 }));
  cmd("m-confirm", (c) => c.ui.confirm("Sure?", "msg"));
  cmd("m-confirm-t", (c) => c.ui.confirm("Sure?", "msg", { timeout: 1500 }));
  cmd("m-notify", (c) => { c.ui.notify("hello", "info"); return "returned"; });
  cmd("m-status", (c) => { c.ui.setStatus("k", "v"); c.ui.setStatus("k", undefined); return "returned"; });
  cmd("m-custom", (c) => c.ui.custom(() => ({ render: () => ["x"], invalidate() {} }), { overlay: true }));
}
