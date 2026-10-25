// Stands in for legacy/tests/run.ts in the runner's own tests (KILN_LEGACY_RUNNER). It reports what the runner handed it.
const mode = process.env.PROBE_MODE;
console.log(`PROBE KILN_PI=${process.env.KILN_PI ?? "unset"} ARGS=${JSON.stringify(process.argv.slice(2))}`);
if (mode === "zero") { console.log("ℹ tests 0"); process.exit(0); }
console.log("ℹ tests 1\nℹ pass 1\nℹ fail 0");
process.exit(mode === "fail" ? 1 : 0);
