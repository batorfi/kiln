// kiln/tests/negative/async-await.test.ts — T012 (Foundational), r7 · D8 / contract A5 (S11).
//
// The async spine (NC1=B) introduces a NEW way to be silently wrong: a FORGOTTEN `await` turns a probe /
// walk result into a Promise, and `promise.ready` is `undefined`. A falsify test written as
// `assert.ok(!broken.ready)` then PASSES VACUOUSLY — the hook "flips ready=false" only because there is no
// `ready` at all. (Measured on this suite when the probes went async: every un-awaited probe test crashed
// loudly on its next line, and exactly ONE assertion — `assert.doesNotThrow(() => schedule(...))` — passed
// vacuously. Loud-by-luck is not a guard; a lone `assert.ok(!x.ready)` would have been green.)
//
// This is a STATIC guard: every call to an async-spine function, anywhere in kiln/{src,validate,tests},
// must be `await`ed, `return`ed (a promise handed on), or one of the deliberate SYNCHRONOUS-throw
// assertions (`assert.throws(() => schedule(...))` — D3: `schedule` is not `async`, so a P-II config
// error still throws before any promise exists). A miss names the file and line. The scanner is itself
// tested with planted cases, so a guard that silently stopped matching would be caught here too.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { checkRuntimeReady } from "../../validate/runtime-ready.ts";

/** The closed async propagation set (contract A2). Adding a name here is a contract change. */
export const ASYNC_SPINE = [
  "run", "yield_", "schedule",
  "buildStubWalk", "buildLiveWalk",
  "checkRuntimeReady", "checkOverlayReady", "checkLiveModelReady", "checkOllamaReady",
  "reportRuntimeReady", "reportOverlayReady", "reportLiveModelReady", "reportOllamaReady",
] as const;

const CALL = new RegExp(`(?<![\\w.$])(${ASYNC_SPINE.join("|")})\\(`, "g");

/** Strip a trailing `// …` comment and string literals so prose and messages are never mistaken for calls. */
function code(line: string): string {
  return line.replace(/(["'`])(?:\\.|(?!\1).)*\1/g, '""').replace(/\/\/.*$/, "");
}

/** Return the un-awaited async-spine calls in `src` as `{ line, name, text }`. */
export function findUnawaited(src: string): { line: number; name: string; text: string }[] {
  const out: { line: number; name: string; text: string }[] = [];
  const lines = src.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const st = raw.trimStart();
    if (st.startsWith("//") || st.startsWith("*") || st.startsWith("/*") || st.startsWith("import ")) continue;
    if (/\b(?:async\s+)?function\b|^\s*export\s+(?:async\s+)?function\b/.test(raw)) continue; // a declaration, not a call
    const c = code(raw);
    // A method/interface DECLARATION (`run(workUnit: WorkUnit): unknown {`) has a TYPED parameter or a
    // return-type annotation right after the name; a call never does. Skip those.
    if (new RegExp(`^\\s*(?:async\\s+)?(?:${ASYNC_SPINE.join("|")})\\(\\s*(?:\\w+\\??\\s*:|\\)\\s*:|\\.\\.\\.)`).test(c)) continue;
    CALL.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = CALL.exec(c)) !== null) {
      const before = c.slice(0, m.index);
      if (/\bawait\s*\(?\s*$/.test(before)) continue; // awaited (incl. `(await f(...))`)
      if (/\breturn\s+$/.test(before)) continue; // a promise handed on to the caller
      if (/assert\.throws\(\s*\(\)\s*=>\s*$/.test(before)) continue; // D3: the deliberate SYNC-throw assertion
      if (/assert\.(?:doesNotReject|rejects)\(\s*(?:async\s*)?\(\)\s*=>\s*$/.test(before)) continue; // an async assertion
      if (/\.then\(\s*$/.test(before)) continue;
      out.push({ line: i + 1, name: m[1], text: raw.trim() });
    }
  }
  return out;
}

function tsFiles(dir: string): string[] {
  const res: string[] = [];
  for (const e of readdirSync(dir)) {
    const p = `${dir}/${e}`;
    if (statSync(p).isDirectory()) res.push(...tsFiles(p));
    else if (e.endsWith(".ts")) res.push(p);
  }
  return res;
}

const root = fileURLToPath(new URL("../..", import.meta.url)).replace(/\/$/, ""); // no trailing "/" — else paths read `kiln//x` and SELF never matches
const SELF = fileURLToPath(import.meta.url);

test("A5 / D8: every async-spine call in kiln/{src,validate,tests} is awaited (no forgotten `await`)", () => {
  const offenders: string[] = [];
  for (const dir of ["src", "validate", "tests"]) {
    for (const f of tsFiles(`${root}/${dir}`)) {
      if (f === SELF) continue; // this file's planted negatives are deliberate
      for (const o of findUnawaited(readFileSync(f, "utf8"))) {
        offenders.push(`kiln${f.slice(root.length)}:${o.line} — un-awaited ${o.name}(…): ${o.text}`);
      }
    }
  }
  assert.deepEqual(offenders, [], `a forgotten await turns a probe result into a Promise (.ready === undefined) and can pass a falsify test vacuously:\n  ${offenders.join("\n  ")}`);
});

test("A5 / D8: the scanner itself is real — planted forgotten awaits are CAUGHT, named", () => {
  const planted = [
    "const broken = checkOverlayReady({ brokenGate0: true });",
    "assert.ok(!broken.ready, 'hook flips ready=false');", // the vacuous shape — but only the call above is flagged
    "const w = buildLiveWalk({ mode: 'live' });",
    "const r = run(lane, units, resident);",
    "const s = schedule(units, resident);",
  ].join("\n");
  const hits = findUnawaited(planted);
  assert.deepEqual(hits.map((h) => h.name), ["checkOverlayReady", "buildLiveWalk", "run", "schedule"], "every forgotten await is named");
  assert.equal(hits[0].line, 1, "the offending line is named");
});

test("A5 / D8: the scanner accepts the legitimate forms (await, return, sync-throw assertion, declarations, prose)", () => {
  const ok = [
    "const r = await checkRuntimeReady();",
    "const x = (await buildStubWalk({})).lines;",
    "return run(makeLane(), units, resident);", // scheduler.ts: hands the promise on
    "assert.throws(() => schedule([weak], resident), /G2/);", // D3: schedule is NOT async ⇒ still a sync throw
    "await assert.doesNotReject(async () => schedule(lod, resident));",
    "export async function checkRuntimeReady(o = {}) {",
    "// checkRuntimeReady() in a comment",
    'const msg = "call checkOverlayReady() first";', // inside a string
    "resident.run(unit);", // a METHOD call is the Resident interface, not the spine `run`
    "  run(workUnit: WorkUnit): unknown | Promise<unknown>;", // an interface method DECLARATION
    "    run(workUnit: WorkUnit): unknown {", // an object-literal method DEFINITION
    "    async run(unit: WorkUnit): Promise<string> {", // an ASYNC method definition (the Ollama resident)
  ].join("\n");
  assert.deepEqual(findUnawaited(ok), [], "no false positives on legitimate forms");
});

test("A5: the hazard is real — an un-awaited probe is a thenable whose `.ready` is undefined", async () => {
  const p: any = checkRuntimeReady(); // deliberately NOT awaited, to document what a forgotten await yields
  assert.equal(typeof p.then, "function", "an async probe returns a Promise");
  assert.equal(p.ready, undefined, "…so `!p.ready` would be TRUE — a falsify test would pass vacuously");
  assert.equal((await p).ready, true, "awaited, it resolves to the real result");
});
