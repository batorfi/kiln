// T006 — the smoke check: the pinned package loads, a SQLite store opens in a private temporary directory, and closes.
// It touches nothing outside that directory (removed afterwards), opens no network socket, and calls no model.
//   npm run smoke            (or)   npx -y node@22.19.0 src/smoke.ts
import { mkdtempSync, rmSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context";
import { openNodeSqliteStorage } from "@earendil-works/pi-durable/storage/sqlite/node";

const require = createRequire(import.meta.url);
const pkg = require("@earendil-works/pi-durable/package.json") as { name: string; version: string };

const dir = mkdtempSync(join(tmpdir(), "r42-smoke-"));
try {
  const file = join(dir, "pi.sqlite");
  const storage = await openNodeSqliteStorage(file);
  const created = statSync(file).isFile();
  await storage.close(BACKGROUND_CONTEXT);
  console.log(`${pkg.name} ${pkg.version} | node ${process.version} | store created: ${created} | closed cleanly`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
