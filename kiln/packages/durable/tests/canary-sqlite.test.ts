// r13 T070 (FR-054) — the canary for Node's experimental built-in SQLite, on which the runtime's only durable storage and the owner lock rest. If the module is missing or behaves differently on the Node
// that is running, this fails BY NAME and first, instead of a gate proof failing mysteriously. It does not assert the version-dependent warning. And it checks that the store opens in ONE function.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { tokenize } from "#checks/lex.ts";

const PACKAGES = fileURLToPath(new URL("../..", import.meta.url));
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (f === "node_modules" ? [] : statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : f.endsWith(".ts") ? [join(d, f)] : []));

test("CANARY node:sqlite: the module loads, and opens, writes, reads, runs a serialized transaction and closes", async () => {
  let sqlite: typeof import("node:sqlite");
  try {
    sqlite = await import("node:sqlite");
  } catch (e) {
    assert.fail(`CANARY: node:sqlite is not available on ${process.version}: ${(e as Error).message}`);
  }
  assert.equal(typeof sqlite.DatabaseSync, "function", `CANARY: DatabaseSync is missing on ${process.version}`);
  const db = new sqlite.DatabaseSync(":memory:");
  db.exec("CREATE TABLE t (id INTEGER PRIMARY KEY CHECK (id = 1), v TEXT NOT NULL)");
  db.exec("BEGIN IMMEDIATE"); // the transaction the owner lock decides in
  db.prepare("INSERT OR REPLACE INTO t (id, v) VALUES (1, ?)").run("hello");
  db.exec("COMMIT");
  assert.deepEqual({ ...(db.prepare("SELECT v FROM t WHERE id = 1").get() as object) }, { v: "hello" }, "CANARY: a row written is not the row read back");
  db.exec("BEGIN IMMEDIATE");
  db.prepare("DELETE FROM t").run();
  db.exec("ROLLBACK");
  assert.equal((db.prepare("SELECT count(*) AS n FROM t").get() as { n: number }).n, 1, "CANARY: ROLLBACK did not undo the delete");
  db.close();
});

test("the storage is opened in ONE file (library/open.ts: the owner's store and the ownerless reader), and node:sqlite is used by KILN source in exactly two places: that store path (via the runtime) and the owner lock", () => {
  const users: string[] = [];
  const opens: string[] = [];
  for (const f of walk(PACKAGES)) {
    if (f.includes("/tests/")) continue;
    const code = tokenize(readFileSync(f, "utf8")).code;
    if (/["']node:sqlite["']/.test(code)) users.push(relative(PACKAGES, f));
    if (/\bopenNodeSqliteStorage\s*\(/.test(code)) opens.push(relative(PACKAGES, f));
  }
  assert.deepEqual(users, ["durable/src/owner-lock.ts"], "the lock is the only KILN file that imports node:sqlite itself");
  assert.deepEqual(opens, ["durable/src/library/open.ts"], "the storage is opened in one file");
  const open = tokenize(readFileSync(join(PACKAGES, "durable/src/library/open.ts"), "utf8")).code;
  assert.equal((open.match(/\bopenNodeSqliteStorage\s*\(/g) ?? []).length, 2, "twice there: `openStore` (the owner, which also guards the version and resumes) and `openReader` (no owner, reads only)");
});
