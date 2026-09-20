// kiln/validate/_cli.ts — T010 (Foundational), r7 · contract A6 (CLI exit discipline).
//
// Every probe CLI is async now (NC1=B). An unhandled rejection that exits 0 would turn a FAILED proof
// into a PASSING command, so each CLI runs through here: a resolved exit code is honoured, and a
// REJECTED promise prints a named FAIL and exits NON-ZERO — never 0. Pure glue; no network, no gate.

export function runCli(main: () => Promise<number>): void {
  main().then(
    (code) => process.exit(code),
    (err) => {
      console.error(`FAIL — probe crashed (rejected promise; a crash is never a pass): ${(err as Error)?.stack ?? String(err)}`);
      process.exit(1);
    },
  );
}
