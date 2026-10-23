// kiln/tests/pi/ui/gate0-disjointness.test.ts — T019 (US3), r9 · FR-003, "structurally unreachable" per contract L4 · OFFLINE tier.
// A STATIC check on live-ctx.ts's own source (mirroring r7/r8's own static-purity tests, e.g. tests/pi/scan-pi.test.ts): the function
// that builds Layer B's question/apply path (`raiseLayerB`) contains NO call to `recordGate0Decision`; the function that builds Layer
// C's Gate-0-face path (`raiseLayerC`) contains NO call to `applyMove`. Grep-based on the ACTUAL function bodies, not merely "the tests
// I wrote happen to pass."
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("../../../pi/ui/live-ctx.ts", import.meta.url)), "utf8");

/** Extract one top-level `function <name>(...) { ... }` body by brace-matching, starting from `function <name>`. */
function extractFunctionBody(src: string, name: string): string {
  const startMarker = `function ${name}(`;
  const start = src.indexOf(startMarker);
  assert.notEqual(start, -1, `function ${name} not found in live-ctx.ts`);
  const braceStart = src.indexOf("{", start);
  let depth = 0;
  for (let i = braceStart; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) return src.slice(braceStart, i + 1);
    }
  }
  throw new Error(`unbalanced braces extracting ${name}`);
}

test("raiseLayerB's body contains NO call to recordGate0Decision", () => {
  const body = extractFunctionBody(source, "raiseLayerB");
  assert.doesNotMatch(body, /recordGate0Decision/);
});

test("raiseLayerC's body contains NO call to applyMove", () => {
  const body = extractFunctionBody(source, "raiseLayerC");
  assert.doesNotMatch(body, /\bapplyMove\(/);
});

test("raiseLayerB DOES call applyMove somewhere in its body (sanity: the extraction itself is meaningful)", () => {
  const body = extractFunctionBody(source, "raiseLayerB");
  assert.match(body, /\bapplyMove\b/);
});

test("raiseLayerC DOES call recordGate0Decision somewhere in its body (sanity: the extraction itself is meaningful)", () => {
  const body = extractFunctionBody(source, "raiseLayerC");
  assert.match(body, /recordGate0Decision/);
});

test("there is no shared 'apply(outcome)' dispatcher fed both functions — each names its own apply call directly (L4)", () => {
  // A dispatcher would be a function whose body calls BOTH applyMove and recordGate0Decision. runGateFlow (the shared per-gate flow)
  // must not itself hard-code either — it only calls the injected `opts.onAnswered`, which raiseLayerB/raiseLayerC each bind separately.
  const runGateFlowBody = extractFunctionBody(source, "runGateFlow");
  assert.doesNotMatch(runGateFlowBody, /\bapplyMove\(/);
  assert.doesNotMatch(runGateFlowBody, /recordGate0Decision\(/);
});
