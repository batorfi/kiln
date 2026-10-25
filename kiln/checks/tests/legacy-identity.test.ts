// L1–L5 of contracts/legacy-identity.md (r12 T039), written first. Each negative case works on a temporary COPY of legacy/ — the real tree is
// never touched — and must fail by its own name.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkLegacy } from "#checks/legacy-identity.ts";

const kilnDir = fileURLToPath(new URL("../..", import.meta.url));
const realLegacy = join(kilnDir, "..", "legacy");
const manifest = JSON.parse(readFileSync(join(kilnDir, "checks", "legacy-manifest.json"), "utf8"));
const copies = JSON.parse(readFileSync(join(kilnDir, "checks", "legacy-copies.json"), "utf8"));

function withLegacyCopy<T>(fn: (dir: string) => T): T {
  const tmp = mkdtempSync(join(tmpdir(), "kiln-legacy-"));
  try {
    const dir = join(tmp, "legacy");
    cpSync(realLegacy, dir, { recursive: true });
    return fn(dir);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
const codes = (r: ReturnType<typeof checkLegacy>) => r.failures.map((f) => f.code);

test("L1 the real tree passes: every manifest file matches, and the count is reported", () => {
  const r = checkLegacy();
  assert.deepEqual(r.failures, []);
  assert.equal(r.ok, true);
  assert.equal(r.name, "legacy");
  assert.equal(r.scanned, manifest.files.length);
  assert.ok(manifest.files.length > 100, "a manifest that lists almost nothing proves almost nothing");
});

test("L2 one byte changed in a copy fails legacy-file-modified, naming the file", () => {
  withLegacyCopy((dir) => {
    const target = join(dir, "src", "clock.ts");
    writeFileSync(target, readFileSync(target, "utf8") + " ");
    const r = checkLegacy({ legacyDir: dir });
    assert.equal(r.ok, false);
    assert.deepEqual(codes(r), ["legacy-file-modified"]);
    assert.match(r.failures[0].file ?? "", /src\/clock\.ts$/);
  });
});

test("L3 a file deleted fails legacy-file-missing, naming the file", () => {
  withLegacyCopy((dir) => {
    rmSync(join(dir, "validate", "log.ts"));
    const r = checkLegacy({ legacyDir: dir });
    assert.deepEqual(codes(r), ["legacy-file-missing"]);
    assert.match(r.failures[0].file ?? "", /validate\/log\.ts$/);
  });
});

test("L4 a file added fails legacy-file-added; a new factory-log artifact does not", () => {
  withLegacyCopy((dir) => {
    writeFileSync(join(dir, "factory-log", "x.jsonl"), "{}\n");
    writeFileSync(join(dir, "factory-log", "y.log"), "x\n");
    assert.equal(checkLegacy({ legacyDir: dir }).ok, true, "runtime artifacts under the ignore globs are not additions");
    mkdirSync(join(dir, "src", "sub"), { recursive: true });
    writeFileSync(join(dir, "src", "sub", "new.ts"), "export {};\n");
    const r = checkLegacy({ legacyDir: dir });
    assert.deepEqual(codes(r), ["legacy-file-added"]);
    assert.match(r.failures[0].file ?? "", /src\/sub\/new\.ts$/);
  });
});

test("L4 a factory-log file outside the ignored extensions is still an addition", () => {
  withLegacyCopy((dir) => {
    writeFileSync(join(dir, "factory-log", "notes.txt"), "x\n");
    assert.deepEqual(codes(checkLegacy({ legacyDir: dir })), ["legacy-file-added"]);
  });
});

test("L5 a copy record naming a legacy path outside the manifest fails legacy-copy-unlisted", () => {
  const bad = { ...copies, records: [...copies.records, { kind: "ported", legacy: "src/not-in-manifest.ts", ported: "packages/record/src/clock.ts", retiresWith: "legacy-retirement" }] };
  const r = checkLegacy({ copies: bad });
  assert.deepEqual(codes(r), ["legacy-copy-unlisted"]);
  assert.match(r.failures[0].detail, /not-in-manifest\.ts/);
});

test("L5 a ported path that does not exist fails legacy-copy-unlisted", () => {
  const bad = { ...copies, records: [...copies.records, { kind: "ported", legacy: "src/clock.ts", ported: "packages/record/src/no-such-file.ts", retiresWith: "legacy-retirement" }] };
  const r = checkLegacy({ copies: bad });
  assert.deepEqual(codes(r), ["legacy-copy-unlisted"]);
  assert.match(r.failures[0].detail, /no-such-file\.ts/);
});

test("L5 a wait record without portedBy fails legacy-copy-unlisted", () => {
  const bad = { ...copies, records: [...copies.records, { kind: "wait", legacy: "tests/negative/async-await.test.ts", retiresWith: "legacy-retirement" }] };
  assert.deepEqual(codes(checkLegacy({ copies: bad })), ["legacy-copy-unlisted"]);
});

test("L5 a ported path under legacy/ is refused (a copy must live in the new tree)", () => {
  const bad = { ...copies, records: [...copies.records, { kind: "ported", legacy: "src/clock.ts", ported: "../legacy/src/clock.ts", retiresWith: "legacy-retirement" }] };
  assert.deepEqual(codes(checkLegacy({ copies: bad })), ["legacy-copy-unlisted"]);
});

test("never vacuous: an empty manifest fails legacy-zero-files", () => {
  const r = checkLegacy({ manifest: { ...manifest, files: [] } });
  assert.ok(codes(r).includes("legacy-zero-files"));
  assert.equal(r.ok, false);
});

test("a missing legacy directory fails by name instead of throwing", () => {
  const r = checkLegacy({ legacyDir: join(tmpdir(), "kiln-no-such-legacy-dir") });
  assert.equal(r.ok, false);
  assert.ok(codes(r).includes("legacy-file-missing"));
});

test("a malformed copy file fails legacy-manifest-invalid", () => {
  const r = checkLegacy({ copies: { schema: 2, records: [] } as never });
  assert.deepEqual(codes(r), ["legacy-manifest-invalid"]);
});

test("the report lists the deferred cases and says the baseline cross-check is a test", () => {
  const r = checkLegacy();
  assert.ok(r.notes.some((n) => /19 deferred cases/.test(n)), r.notes.join("|"));
  assert.ok(r.notes.some((n) => /baseline-commit cross-check is a test/.test(n)));
});
