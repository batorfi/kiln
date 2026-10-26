// T027 — the evidence runner. For each selected strategy it runs every registered scenario, derives each guarantee's status ONLY from scenarios that ran,
// writes out/evidence.json and prints the table. It REFUSES TO PASS VACUOUSLY (contracts/evidence-cli.md), each refusal by name:
//   evidence-zero-tests · evidence-zero-kill-points · evidence-install-mismatch · evidence-wrong-platform · evidence-owner-failed · evidence-scenario-error
// The exit code means "I examined something and wrote the evidence" — NOT "everything held": a spike reports `not-held`, it does not fail on it.
//   npm run evidence [-- --strategy <name>]… [--only <kind>] [--markdown]        npm run kill-list
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { isEntryPoint } from "./entry.ts";
import { GUARANTEES, SCENARIO_KINDS, type Evidence, type Guarantee, type ScenarioKind, type ScenarioResult, type StrategyEvidence } from "./evidence-model.ts";
import { OwnerFailed } from "./harness.ts";
import { checkInstall, InstallMismatch } from "./install-check.ts";
import type { Scenario } from "./scenario.ts";
import { scenarios as registry } from "./scenarios/index.ts";
import { summarizeGuarantee } from "./status.ts";
import { STRATEGY_NAMES, loadStrategy, type Strategy } from "./strategy.ts";
import { renderMarkdown, renderTable } from "./table.ts";

const SPIKE_ROOT = fileURLToPath(new URL("..", import.meta.url));

export interface RunOptions {
  strategies: Strategy[];
  /** Default: the registry (src/scenarios/index.ts). Tests inject their own. */
  scenarios?: Scenario[];
  only?: ScenarioKind;
  installRoot?: string;
  platform?: string;
  /** Where to write evidence.json; `false` to write nothing. Default: <spike>/out */
  outDir?: string | false;
  markdown?: boolean;
  clock?: () => Date;
}

export interface Failure {
  code: string;
  detail: string;
}

export interface RunResult {
  exitCode: 0 | 1;
  failures: Failure[];
  evidence?: Evidence;
  output: string;
}

export async function runEvidence(opts: RunOptions): Promise<RunResult> {
  const clock = opts.clock ?? (() => new Date());
  const failures: Failure[] = [];
  const fail = (code: string, detail: string): void => void failures.push({ code, detail });
  const lines: string[] = [];
  const done = (evidence?: Evidence): RunResult => {
    for (const f of failures) lines.push(`FAIL ${f.code} — ${f.detail}`);
    return { exitCode: failures.length ? 1 : 0, failures, evidence, output: lines.join("\n") };
  };

  let pin: { name: string; version: string; integrity: string };
  try {
    pin = checkInstall(opts.installRoot);
  } catch (e) {
    if (e instanceof InstallMismatch) fail(e.code, e.message);
    else throw e;
    return done();
  }

  const platform = opts.platform ?? process.platform;
  const unsupported = platform !== "darwin";
  if (unsupported) fail("evidence-wrong-platform", `this evidence is claimed for macOS only; running on "${platform}" — the table below is UNSUPPORTED`);

  const wanted = (opts.scenarios ?? registry).filter((s) => !opts.only || s.kind === opts.only);
  if (wanted.length === 0) {
    fail("evidence-zero-tests", opts.only ? `no scenario of kind "${opts.only}" is registered` : "no scenario is registered: a run that examined nothing proves nothing");
    return done();
  }

  const startedAt = clock().toISOString();
  const killRelevant = !opts.only || opts.only === "kill-point";
  const killScenario = wanted.find((s) => s.kind === "kill-point");
  const strategies: Record<string, StrategyEvidence> = {};
  let ranTotal = 0;

  for (const strategy of opts.strategies) {
    const results: ScenarioResult[] = [];
    for (const sc of wanted) {
      try {
        results.push(...(await sc.run(strategy)));
      } catch (e) {
        const owner = e instanceof OwnerFailed;
        fail(owner ? "evidence-owner-failed" : "evidence-scenario-error", `${strategy.name} / ${sc.id}: ${(e as Error).message}`);
        for (const g of sc.guarantees) results.push({ scenario: `${sc.id}:error`, kind: sc.kind, guarantee: g, strategy: strategy.name, ran: false, passed: false, violated: [], detail: (e as Error).message });
      }
    }

    const declared = strategy.killPoints.map((k) => k.name);
    const exercisedSet = new Set(results.filter((r) => r.kind === "kill-point" && r.ran && r.killPoint).map((r) => r.killPoint!));
    const notes: string[] = [];
    if (killRelevant) {
      if (declared.length === 0) fail("evidence-zero-kill-points", `${strategy.name} declared no kill points: the guarantees they would test are unproven`);
      else if (exercisedSet.size === 0) fail("evidence-zero-kill-points", `${strategy.name} declared ${declared.length} kill points and exercised none`);
      else
        for (const p of declared.filter((d) => !exercisedSet.has(d))) {
          notes.push(`kill point "${p}" was not exercised`);
          for (const g of killScenario?.guarantees ?? ["a"]) results.push({ scenario: `kill-point:${p}`, kind: "kill-point", guarantee: g, strategy: strategy.name, ran: false, passed: false, violated: [], killPoint: p, detail: "declared but not exercised" });
        }
    }

    ranTotal += results.filter((r) => r.ran).length;
    const guarantees = Object.fromEntries(GUARANTEES.map((g: Guarantee) => [g, summarizeGuarantee(results.filter((r) => r.guarantee === g), killRelevant ? { declaredKillPoints: declared.length } : {})])) as StrategyEvidence["guarantees"];
    strategies[strategy.name] = {
      name: strategy.name,
      native: strategy.native,
      testOnly: Boolean(strategy.testOnly),
      killPoints: strategy.killPoints.map((k) => ({ name: k.name, phase: k.phase })),
      exercised: exercisedSet.size,
      randomKills: results.filter((r) => r.kind === "random-kill" && r.ran).reduce((n, r) => n + (r.counts?.trials ?? 1), 0),
      caveats: strategy.caveats,
      guarantees,
      notes,
    };
  }

  if (ranTotal === 0) {
    fail("evidence-zero-tests", "scenarios were registered but none of them ran");
    return done();
  }

  const evidence: Evidence = { piDurable: pin, node: process.version, platform, startedAt, finishedAt: clock().toISOString(), strategies };
  if (unsupported) lines.push("*** UNSUPPORTED PLATFORM — results below are not evidence for the verdict ***", "");
  lines.push(opts.markdown ? renderMarkdown(evidence) : renderTable(evidence));
  if (opts.outDir !== false) {
    const dir = opts.outDir ?? join(SPIKE_ROOT, "out");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "evidence.json"), JSON.stringify(evidence, null, 2) + "\n");
    lines.push("", `evidence written to ${join(dir, "evidence.json")}`);
  }
  return done(evidence);
}

// ── the CLI ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function main(argv: string[]): Promise<number> {
  const usage = `usage: node src/evidence.ts [--strategy <name>]… [--only <kind>] [--markdown] [--kill-list]\nstrategies: ${STRATEGY_NAMES.join(", ")}\nkinds: ${SCENARIO_KINDS.join(", ")}`;
  const names: string[] = [];
  let only: ScenarioKind | undefined;
  let markdown = false;
  let killList = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--strategy") names.push(argv[++i] ?? "");
    else if (a === "--only") only = argv[++i] as ScenarioKind;
    else if (a === "--markdown") markdown = true;
    else if (a === "--kill-list") killList = true;
    else {
      console.error(a.startsWith("-") ? `unknown flag "${a}"\n${usage}` : `unexpected argument "${a}"\n${usage}`);
      return 2;
    }
  }
  if (only !== undefined && !(SCENARIO_KINDS as readonly string[]).includes(only)) {
    console.error(`unknown kind "${only}"\n${usage}`);
    return 2;
  }
  const wanted = names.length ? names : [...STRATEGY_NAMES];
  const strategies: Strategy[] = [];
  const unbuilt: string[] = [];
  for (const n of wanted) {
    try {
      strategies.push(await loadStrategy(n));
    } catch (e) {
      if (names.length) {
        console.error((e as Error).message);
        return 2;
      }
      unbuilt.push(n);
    }
  }
  if (unbuilt.length) console.error(`not built yet (skipped): ${unbuilt.join(", ")}`);

  if (killList) {
    for (const s of strategies) for (const k of s.killPoints) console.log(`${s.name}\t${k.name}\t${k.phase}\t${k.where}`);
    return 0;
  }
  const result = await runEvidence({ strategies, only, markdown });
  console.log(result.output);
  return result.exitCode;
}

if (isEntryPoint(import.meta.url)) process.exitCode = await main(process.argv.slice(2));
