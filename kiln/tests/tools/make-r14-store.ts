// r15 T005 — makes the r14-shaped store fixtures with r14's UNCHANGED code (run it before any r15 source change; it cannot be re-run afterwards).
//   node tests/tools/make-r14-store.ts
// It runs two walks through the in-process factory with an injected clock and fixed keys, closes each factory cleanly (so the file is checkpointed, no -wal), and copies factory.sqlite to
// fixtures/stores/<name>/. The library gives its conversations random ids, so the files are not byte-reproducible: the committed copies, and the hashes in fixtures/stores/README.md, are the record.
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { openFactory } from "#durable/factory.ts";
import { drive, INTERFACE, PLAIN, walkTo } from "../../packages/durable/tests/walk/support.ts";

const here = fileURLToPath(new URL("../../fixtures/stores/", import.meta.url));
const T0 = Date.UTC(2026, 0, 1);

async function make(name: string, run: (f: Awaited<ReturnType<typeof openFactory>>) => Promise<void>): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), "k15-r14store-"));
  const store = join(dir, "s");
  let tick = 0;
  const f = await openFactory({ store, now: () => T0 + 1000 * tick++ });
  try {
    await f.ready;
    await run(f);
  } finally {
    await f.close();
  }
  mkdirSync(join(here, name), { recursive: true });
  copyFileSync(join(store, "factory.sqlite"), join(here, name, "factory.sqlite"));
  rmSync(dir, { recursive: true, force: true });
  console.log(`made ${name}`);
}

await make("r14-interface-done", async (f) => {
  await f.walks.admit("fixture-admit-1", "iface", INTERFACE);
  const d = await drive(f, "iface");
  if (d.last.status !== "done") throw new Error(`the interface walk ended ${d.last.status}, not done`);
});
await make("r14-plain-waiting", async (f) => {
  await f.walks.admit("fixture-admit-1", "plain", PLAIN);
  const v = await walkTo(f, "plain", "3-spec");
  if (v.openGate?.gateKey !== "3-spec") throw new Error("the plain walk did not reach Specification");
});
process.exit(0);
