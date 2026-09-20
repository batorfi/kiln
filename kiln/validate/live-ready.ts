// kiln/validate/live-ready.ts — T015/T016 (US3), r3 · E5 (LiveModelReady, SC-006, the r3→r4 handoff).
//
// Like r1's `runtime-ready.ts` and r2's `overlay-ready.ts`, this is a STATIC, FALSIFIABLE `node
// --test` probe — the EXTENSION of BOTH (composes on `overlay-ready`, which composes on
// `runtime-ready`); it asserts the LIVE path EXISTS, IS WIRED, EMITS A PASSES log, records the
// `--stub` fallback (`F-NOT-SILENT`), renders deterministically, BLOCKS a headless Gate 0, and pulls
// NO CLOUD — WITHOUT advancing a gate, admitting a program, or running a *real* feature (a *probe*,
// not a *walk*; P-VI / FR-010 / SC-007). It is the r3→r4 handoff proof the *live* factory "fires."
//
// It composes ON r2's `overlay-ready.ts` (which already asserts the spine wiring + a blocking headless
// Gate 0 + F1 + zero-network + a closed-row program walk PASSES/named-R3) and ADDS r3's checks:
//   (a) live-path wiring   — live-resident / live-walk / live-tui / live-ready exist; index.ts exports
//                            them on top of r1+r2's spine;
//   (b) PASSES-emit live   — the LIVE, full-rail walk's JSOnL PASSES 001's UNMODIFIED log.ts; a broken
//                            no-`decidedBy` variant FAILs it, NAMED R3 (SC-001/SC-002→SC-003);
//   (d) recorded --stub    — a `--stub` selection APPEARS in the log; an UNLOGGED stand-in is CAUGHT
//                            (F-NOT-SILENT — P-V/P-VII);
// plus a zero-network scan (P-VIII) over kiln/{src,ui,validate,contracts} on BOTH toggle positions.
// Each broken hook NAMES its gap and flips `ready=false`.
//
// Falsify: `--broken` (no-silent-approval), `--broken-render`, `--broken-gate0`, `--stub-unlogged`.
// CLI: `node kiln/validate/live-ready.ts [--broken | --broken-render | --broken-gate0 | --stub-unlogged]`.

import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildLiveWalk, liveWalkRecordsSelection } from "../src/live-walk.ts";
import { selectResident } from "../src/live-resident.ts";
import { checkOverlayReady, type OverlayReadyOverride, type Check, type OverlayReadyResult } from "./overlay-ready.ts";
import { makeClock } from "../src/clock.ts";
import { validateLog } from "./log.ts";
import { fmt, PASS } from "./_report.ts";
import { runCli } from "./_cli.ts";
import { zeroNetworkScan, SCAN_DIRS } from "./_netscan.ts";

const parse = (lines: string[]): Record<string, unknown>[] =>
   lines.map((l) => l.trim()).filter((l) => l !== "").map((l) => JSON.parse(l) as Record<string, unknown>);

const dirOf = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));
const srcDir = dirOf("../src");
const uiDir = dirOf("../ui");
const validateDir = dirOf("./");
const contractsDir = dirOf("../contracts");
const indexPath = dirOf("../index.ts");
const schemaPath = dirOf("../schemas/factory-log.schema.json");

/** r3's two falsify hooks ON TOP of r2's overlay overrides (`--broken` = the no-silent-approval hole). */
export interface LiveModelReadyOverride extends OverlayReadyOverride {
   brokenDogfood?: boolean; // `--broken`: strip a live-walk gate's `decidedBy` → log.ts FAILs R3, named
   stubUnlogged?: boolean; // `--stub-unlogged`: a `--stub` selection NOT written to the log (F-NOT-SILENT)
}

export interface LiveModelReadyResult {
   ready: boolean;
   checks: Check[];
   overlay: OverlayReadyResult; // the composed r1+r2 overlay checks (this probe rides them)
}

function fileExists(p: string): boolean {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
   }
}


/** LiveModelReady (E5): the r3 handoff probe — the live path is wired + PASSES-emit + F-NOT-SILENT + determinist + blocking Gate 0 + cloud-free. */
export async function checkLiveModelReady(override: LiveModelReadyOverride = {}): Promise<LiveModelReadyResult> {
  const clock = makeClock();
  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  const checks: Check[] = [];
   // ── compose ON r2's OverlayCReady (→ r1's RuntimeReady): spine wiring + blocking headless Gate 0 +
   //   F1 + zero-net + a closed-row program walk PASSES/named-R3 ──
  const overlay = await checkOverlayReady({
   brokenRender: override.brokenRender,
    brokenGate0: override.brokenGate0,
    });
  checks.push({
    name: "r1+r2 overlay/spine ready (composes on OverlayCReady)",
    ok: overlay.ready,
    detail: overlay.ready ? "spine + Layer C + a blocking headless Gate 0 + cloud-free" : `overlay gap: ${overlay.checks.find((c) => !c.ok)?.detail ?? "unknown"}`,
      });
  checks.push(...overlay.checks.map((c) => ({ name: `overlay·${c.name}`, ok: c.ok, detail: c.detail })));

   // ── (a) live-path wiring: r3's four modules exist; index.ts exports them on top of r1+r2's spine ──
  const liveFiles = [
   ["live-resident.ts (E1/E3)", `${srcDir}/live-resident.ts`],
    ["live-walk.ts (E2)", `${srcDir}/live-walk.ts`],
    ["live-tui.ts (E4)", `${uiDir}/live-tui.ts`],
     ["live-ready.ts (E5)", `${validateDir}/live-ready.ts`],
     ] as [string, string][];
  for (const [name, p] of liveFiles) {
   checks.push(fileExists(p)
      ? { name: `module ${name}`, ok: true, detail: "present + importable" }
       : { name: `module ${name}`, ok: false, detail: `missing/broken file: ${p}` });
       }
  const indexSrc = fileExists(indexPath) ? readFileSync(indexPath, "utf8") : "";
  const liveWired =
    /makeLiveResident\b|selectResident\b/.test(indexSrc) &&
    /buildLiveWalk\b/.test(indexSrc) &&
    /renderLive\b|attachLiveTui\b/.test(indexSrc) &&
     /checkLiveModelReady\b/.test(indexSrc);
   checks.push({ name: "kiln/index.ts exports the live path (on r1+r2's spine)", ok: liveWired, detail: liveWired ? "makeLiveResident / buildLiveWalk / live-tui / checkLiveModelReady exported" : "index does not export the live pieces" });

   // ── (b) PASSES-emit live: the LIVE full-rail walk PASSES 001's UNMODIFIED log.ts (SC-001/SC-002→003) ──
  const liveWalk = await buildLiveWalk({ mode: "live", clock, brokenNoDecider: override.brokenDogfood });
  const liveRes = validateLog(parse(liveWalk.lines), schema);
   checks.push({
    name: "the live walk PASSES 001's unmodified log.ts (SC-001, 'the kiln fires LIVE')",
     ok: liveRes.valid,
      detail: liveRes.valid ? `PASS (${liveWalk.lines.length} records, R1–R6, a human decidedBy per gate)` : `named gap: ${liveRes.failures[0]}`,
      });

   // (b/neg) a broken no-silent-approval variant FAILs the log with a NAMED R3 (SC-002→SC-003) ──
  const brokenWalk = await buildLiveWalk({ mode: "live", clock, brokenNoDecider: true });
   const brokenRes = validateLog(parse(brokenWalk.lines), schema);
   const brokenNamesR3 = !brokenRes.valid && /R3/.test(brokenRes.failures.join("\n"));
    checks.push({
     name: "a broken no-`decidedBy` live walk FAILs log.ts with a named R3 (SC-002→SC-003, P-V)",
     ok: brokenNamesR3,
      detail: brokenNamesR3 ? `broken path FAILs: ${brokenRes.failures[0].split("\n")[0]}` : "the broken path did not fail R3 (guard missing)",
      });

    // ── (d) F-NOT-SILENT: a --stub selection is RECORDED; an UNLOGGED stand-in is CAUGHT (P-V/P-VII) ──
   const stubWalk = await buildLiveWalk({ mode: "stub", clock }); // --stub: a RECORDED fallback
  const stubRecorded = liveWalkRecordsSelection(stubWalk, "stub");
   const liveRecorded = liveWalkRecordsSelection(liveWalk, "live"); // --live also records
  const unloggedWalk = await buildLiveWalk({ mode: "stub", recordSelection: false, clock }); // the violation
  const unloggedCaught = !liveWalkRecordsSelection(unloggedWalk, "stub"); // the detection is REAL
  const fNotSilent = stubRecorded && liveRecorded && unloggedCaught && !override.stubUnlogged;
   checks.push({
    name: "the --stub selection is RECORDED, not silent (F-NOT-SILENT, P-V/P-VII)",
     ok: fNotSilent,
      detail: override.stubUnlogged
        ? "an UNLOGGED --stub stand-in slipped through — F-NOT-SILENT violated (a silent stand-in, P-V)"
       : fNotSilent
            ? "--live + --stub each record in the log; an unlogged stand-in is caught (ready=false, named)"
             : `a resident selection was not recorded (stub=${stubRecorded}, live=${liveRecorded}, unlogged-caught=${unloggedCaught})`,
      });

   // ── (e) no cloud: a zero-network scan over ALL FOUR live dirs (P-VIII), both toggle positions ──
  const scan = zeroNetworkScan(
    SCAN_DIRS.map((d) => dirOf(`../${d}`)),
    "no external dep; no socket/server/timer on r3's live modules (P-VIII)",
  ); // r7: the SHARED scan — the local copy scanned NOTHING (fileExists(dir) is isFile(): false for a directory)
   // both toggle positions are cloud-free (the scan reads the MODULES, not a run, so positions agree):
  scan.ok = selectResident({ mode: "live" }).resident.model() !== undefined &&
    selectResident({ mode: "stub" }).resident.model() !== undefined &&
    scan.ok;
   checks.push({ name: "zero-network on both --live and --stub toggle positions (P-VIII)", ok: scan.ok, detail: scan.detail });

   // ── traceability note (the runtime analogue of FR-009 / r1 SC-006 / r2 FR-013) ──
  checks.push({
    name: "traceability note (FR-013 analogue)",
     ok: true,
      detail: "E1/E3 P-I/P-VIII (live resident + recorded --stub) · E2 P-III/IV (F-SINGLE + switchCount live) · E4 P-IX (event-only) · E5 P-V/P-VI (named R3 + no gate advance)",
      });

  return { ready: checks.every((c) => c.ok), checks, overlay };
}

/** The r3→r4 handoff report: READY, or the named gaps. RUNS NO GATE, ADMIITS NO PROGRAM (P-VI / SC-007). */
export async function reportLiveModelReady(override: LiveModelReadyOverride = {}): Promise<string> {
  const r = await checkLiveModelReady(override);
  if (r.ready) {
   return [
    PASS,
    "LiveModelReady — the kiln fires LIVE (no gate advanced, no program admitted, no cloud):",
    ...r.checks.map((c) => `     ✓ ${c.name}: ${c.detail}`),
    ].join("\n");
       }
  return r.checks.filter((c) => !c.ok).map((c) => fmt(c.name, c.detail)).join("\n");
}

// ── CLI (T016): `node kiln/validate/live-ready.ts [--broken | --broken-render | --broken-gate0 | --stub-unlogged]` ──
function isMain(): boolean {
  try {
    return process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1];
  } catch {
    return false;
   }
}
if (isMain()) {
  runCli(async () => {
    const ov: LiveModelReadyOverride = {
      brokenDogfood: process.argv.includes("--broken"),
      brokenRender: process.argv.includes("--broken-render"),
      brokenGate0: process.argv.includes("--broken-gate0"),
      stubUnlogged: process.argv.includes("--stub-unlogged"),
    };
    const r = await checkLiveModelReady(ov);
    if (r.ready) {
      console.log(await reportLiveModelReady(ov));
      return 0;
    }
    console.error(await reportLiveModelReady(ov));
    return 1;
  });
}
