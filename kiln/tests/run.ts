// kiln/tests/run.ts — CR-1 / CR-8 / CR-11 (code review), r7 · the ONE way scripts and people run the suite.
//
// WHY THIS EXISTS. `kiln/package.json` lives in `kiln/`, and `npm run` executes scripts with `kiln/` as the working directory — but the
// scripts used repo-root-relative paths (`kiln/tests/...`), which resolve to `kiln/kiln/...`. Measured: `npm run test:live` ran ZERO
// tests and exited 0 (a silent pass, in a project whose central rule is "never silently approve"); the other scripts crashed. This
// runner resolves everything from ITS OWN location, so it works from any working directory, and it REFUSES a run that executed nothing.
//
//   node tests/run.ts                      the default (offline) suite
//   node tests/run.ts --live               + the live tier (KILN_LIVE=1). Needs a running local Ollama and an installed model.
//   node tests/run.ts --cost               + the cost test, which UNLOADS the model — implies --live AND --serial
//   node tests/run.ts --serial             one test file at a time (`--test-concurrency=1`)
//   node tests/run.ts --pi [path…]         DEMAND the Pi tier (KILN_PI=1) AND refuse a run in which no `PI-LIVE:` test passed (r8, FR-011)
//   node tests/run.ts [flags] <path|glob>… restrict to these paths, RELATIVE TO kiln/ (default: `tests/**/*.test.ts`)
//
// Env vars are set here (not by a `KILN_LIVE=1 node …` shell prefix), so it also works in `cmd.exe`/PowerShell. Pure glue: no network,
// no gate advanced (P-VI).

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const kilnDir = fileURLToPath(new URL("..", import.meta.url));
const args = process.argv.slice(2);
const has = (f: string) => args.includes(f);
const paths = args.filter((a) => !a.startsWith("--"));

const env: NodeJS.ProcessEnv = { ...process.env };
if (has("--live") || has("--cost")) env.KILN_LIVE = "1";
if (has("--cost")) env.KILN_LIVE_COST = "1"; // the cost test unloads the model — never enabled implicitly
if (has("--pi")) env.KILN_PI = "1"; // r8: demand the Pi tier — a missing Pi FAILS the PI-LIVE tests instead of skipping them (F-1)
const serial = has("--serial") || has("--cost"); // parallel files would race the unload

const nodeArgs = ["--test", ...(serial ? ["--test-concurrency=1"] : []), ...(paths.length > 0 ? paths : ["tests/**/*.test.ts"])];
const child = spawn(process.execPath, nodeArgs, { cwd: kilnDir, env, stdio: ["ignore", "pipe", "pipe"] });

let out = "";
child.stdout.on("data", (d: Buffer) => { out += d; process.stdout.write(d); });
child.stderr.on("data", (d: Buffer) => process.stderr.write(d));
/**
 * r8 (FR-011): how many `PI-LIVE:` tests PASSED. Both reporters, because they differ: the spec reporter prints a pass as `✔ PI-LIVE: …` (a skip is
 * `﹣`, a failure `✖`); TAP prints `ok N - PI-LIVE: …` for a pass AND `ok N - PI-LIVE: … # SKIP …` for a skip — so a TAP skip must be excluded by hand.
 */
function piLivePasses(text: string): number {
  return text.split("\n").filter((l) => /^\s*✔\s+PI-LIVE:/.test(l) || (/^\s*ok \d+ - PI-LIVE:/.test(l) && !/#\s*(?:SKIP|TODO)/i.test(l))).length;
}

child.on("close", (code) => {
  const m = /(?:ℹ |# )tests (\d+)/.exec(out);
  const ran = m ? Number(m[1]) : 0;
  if (code === 0 && ran === 0) {
    // `node --test` exits 0 when nothing matched. That is a SILENT PASS — refuse it.
    console.error(`FAIL — the run executed ZERO tests (paths: ${paths.length ? paths.join(" ") : "tests/**/*.test.ts"}, relative to ${kilnDir}). A run that ran nothing proves nothing.`);
    process.exit(1);
  }
  if (has("--pi") && code === 0 && piLivePasses(out) === 0) {
    // `--pi` demanded the Pi tier. A run whose PI-LIVE tests were all skipped, excluded or absent proves nothing about Pi.
    console.error(`FAIL — --pi demanded the Pi tier, but NO \`PI-LIVE:\` test passed (paths: ${paths.length ? paths.join(" ") : "tests/**/*.test.ts"}). A skipped, excluded or misnamed Pi test is not a pass.`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});
