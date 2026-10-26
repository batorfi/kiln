// T049 — the strategies are interchangeable: the same scenarios run against every one, no scenario knows which strategy it is judging, and every strategy
// implements exactly the port. If a fallback is ever built it is held to this file from its first run; if none is built the file still guards the natives.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { runExactlyOnce } from "../src/scenarios/exactly-once.ts";
import { scenarios } from "../src/scenarios/index.ts";
import { loadStrategy, STRATEGY_NAMES, type Strategy } from "../src/strategy.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

async function builtStrategies(): Promise<Strategy[]> {
  const out: Strategy[] = [];
  for (const name of STRATEGY_NAMES) {
    try {
      out.push(await loadStrategy(name));
    } catch {
      /* not built (a fallback that was not needed, or C3): absent, not skipped silently — the count is asserted below */
    }
  }
  return out;
}

test("FP0 the built strategies include both controls and both native attempts", async () => {
  const names = (await builtStrategies()).map((s) => s.name);
  for (const must of ["control-sqlite", "broken-two-commit", "native-signal", "native-abort"]) assert.ok(names.includes(must), `${must} is built`);
});

test("FP1 every strategy is run over the IDENTICAL list of scenario ids — none is skipped for any of them", async () => {
  const registry = scenarios.map((s) => `${s.kind}:${s.id}`);
  assert.equal(new Set(registry).size, registry.length, "the registry has no duplicate scenario");
  const strategies = await builtStrategies();
  const lists: Record<string, string[]> = {};
  for (const s of strategies) lists[s.name] = (await runExactlyOnce(s)).map((r) => r.scenario).sort(); // the cases that do not depend on a strategy's kill points
  const first = lists[strategies[0]!.name]!;
  assert.ok(first.length >= 9);
  for (const [name, ids] of Object.entries(lists)) assert.deepEqual(ids, first, `${name} was run over a different list of scenario ids`);
});

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return f === "node_modules" ? [] : statSync(p).isDirectory() ? walk(p) : p.endsWith(".ts") ? [p] : [];
  });
}

test("FP2 no scenario and no test contains a conditional on a strategy's name", () => {
  const files = [...walk(join(ROOT, "src", "scenarios")), ...walk(join(ROOT, "tests"))].filter((f) => !f.endsWith("fallback-parity.test.ts"));
  assert.ok(files.length >= 8);
  const forbidden = [/strategy\.name\s*(===|==|!==|!=)/, /if\s*\(.*['"](native|fallback|control|broken)-/];
  for (const f of files) {
    const lines = readFileSync(f, "utf8").split("\n");
    lines.forEach((line, i) => {
      for (const re of forbidden) assert.ok(!re.test(line), `${f.replace(ROOT, "")}:${i + 1} branches on a strategy name: ${line.trim()}`);
    });
  }
});

test("FP3 every strategy implements exactly the port: open, submit, state, close — nothing a scenario could lean on beyond that", async () => {
  for (const s of await builtStrategies()) {
    const dir = mkdtempSync(join(tmpdir(), "r42-fp-"));
    try {
      const gate = await s.start({ store: join(dir, "s") });
      assert.deepEqual(Object.keys(gate).sort(), ["close", "open", "state", "submit"], `${s.name} exposes more or less than the port`);
      await gate.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});
