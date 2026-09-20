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
const serial = has("--serial") || has("--cost"); // parallel files would race the unload

const nodeArgs = ["--test", ...(serial ? ["--test-concurrency=1"] : []), ...(paths.length > 0 ? paths : ["tests/**/*.test.ts"])];
const child = spawn(process.execPath, nodeArgs, { cwd: kilnDir, env, stdio: ["ignore", "pipe", "pipe"] });

let out = "";
child.stdout.on("data", (d: Buffer) => { out += d; process.stdout.write(d); });
child.stderr.on("data", (d: Buffer) => process.stderr.write(d));
child.on("close", (code) => {
  const m = /(?:ℹ |# )tests (\d+)/.exec(out);
  const ran = m ? Number(m[1]) : 0;
  if (code === 0 && ran === 0) {
    // `node --test` exits 0 when nothing matched. That is a SILENT PASS — refuse it.
    console.error(`FAIL — the run executed ZERO tests (paths: ${paths.length ? paths.join(" ") : "tests/**/*.test.ts"}, relative to ${kilnDir}). A run that ran nothing proves nothing.`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});
