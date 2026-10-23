// kiln/validate/overlay-ready.ts — T021/T022 (US5): OverlayCReady · E6 (SC-006) · falsifiable probe.
//
// The r2 handoff gate — the EXTENSION of r1's `runtime-ready.ts`. It asserts the Layer-C overlay + its
// Gate-0 face + the headless twin EXIST, are WIRED, render DETERMINISTICALLY, BLOCK a headless Gate 0
// (F1/P-VI: human-only, no auto-advance), and pull NO cloud (P-VIII) — WITHOUT admitting a program or
// advancing a gate or running a *real* feature (a *probe*, not a *walk*; P-VI / FR-012 / SC-007). It
// composes on r1's `runtime-ready.ts` (the spine wiring + the dogfood + the zero-net scan) and adds
// overlay-specific checks. It is FALSIFIABLE: removing/breaking exactly one element names it and
// flips ready=false.
//
// (a) wiring        — overlay.ts / gate0-face.ts / keymap.ts / (extended) twin.ts exist; kiln/index.ts
//                    exports them on top of r1's spine.
// (b) deterministic — a captured state ⇒ a byte-identical `renderOverlay` (SC-005); a headless Gate 0
//                    BLOCKS (prints + `WAIT`s, never auto-advances); Gate 0 admits NO recorded
//                    exception (F1).
// (c) no cloud      — a zero-network scan over kiln/{ui,validate,contracts,src} (P-VIII).
//
// CLI: `node kiln/validate/overlay-ready.ts [--broken-render | --broken-gate0]` — prints READY or a
// named gap. `--broken-*` simulates the failure and NAMES it (falsifiability, SC-006).

import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { FactoryState, RoadmapHead } from "../src/types.ts";
import { onEvent } from "../ui/factory-state.ts";
import { disabledUi } from "../ui/twin.ts";
import { renderOverlay } from "../ui/overlay.ts";
import { recordGate0Decision } from "../ui/gate0-face.ts";
import { buildProgramWalk } from "../src/walk.ts";
import { validateLog } from "./log.ts";
import { fmt, PASS } from "./_report.ts";
import { runCli } from "./_cli.ts";
import { zeroNetworkScan, SCAN_DIRS } from "./_netscan.ts";

// Reuse r1's spine + its dogfood/scan where it is an extension, not a re-derivation.
import { checkRuntimeReady, DEFAULT_DEPS } from "./runtime-ready.ts";

const parse = (lines: string[]): Record<string, unknown>[] =>
   lines.map((l) => l.trim()).filter((l) => l !== "").map((l) => JSON.parse(l) as Record<string, unknown>);

/** A closed 3-row program head Layer C renders + the human admits (a probe fixture, not the real program). */
function overlayState(): FactoryState {
  return {
    resident: { model: "stub", tier: "strongest" },
    running: null,
    queue: [],
    switches: 0,
    wallClock: "12:47",
    roadmap: [
      { id: "r1", short: "core single-lane runtime", deps: [], status: "done", outcome: "@PR#1" },
      { id: "r2", short: "Flow UI — Layer C (roadmap overlay)", deps: ["r1"], status: "active", gate: 3 },
      { id: "r3", short: "first live-model smoke walk", deps: ["r2"], status: "queued" },
          ],
    current: "r2",
    gate0: { status: "approved", rows: "r1..r3", decided_by: "human@batorfi", at: "2026-09-13T06:54:20Z" } as FactoryState["gate0"],
    gate: null,
    };
}

function roadHead(): RoadmapHead {
  return {
    deliverable: "kiln-v1 (probe)",
    owner: "human@batorfi",
    updated: "2026-09-13T06:54:20Z",
    rows: [
      { id: "r1", short: "core single-lane runtime", deps: [], status: "done", outcome: "@PR#1" },
      { id: "r2", short: "Flow UI — Layer C", deps: ["r1"], status: "queued" },
      { id: "r3", short: "first live-model smoke walk", deps: ["r2"], status: "queued" },
             ],
    ordering: ["r1", "r2", "r3"],
    chain_unattended: false,
      gate0: { status: "pending", rows: "r1..r3" },
      trace: "P-VI (Gate 0 human-only), P-V/P-VII (recorded, no silent approval)",
       };
}

export interface OverlayReadyOverride {
  brokenRender?: boolean; // falsify (b): force a non-deterministic render
  brokenGate0?: boolean; // falsify (b): open a Gate-0 auto-advance hole (F1 bypass)
}

export interface Check {
  name: string;
  ok: boolean;
  detail: string;
}
export interface OverlayReadyResult {
  ready: boolean;
  checks: Check[];
}

function fileExists(p: string): boolean {
  try {
    return statSync(p).isFile();
    } catch {
    return false;
     }
}

const uiDir = fileURLToPath(new URL("../ui", import.meta.url));
const CONTRACTS = fileURLToPath(new URL("../contracts", import.meta.url));

export async function checkOverlayReady(override: OverlayReadyOverride = {}): Promise<OverlayReadyResult> {
  const checks: Check[] = [];

  // ── (a) presence + wiring: the overlay set exists; kiln/index.ts exports it on top of r1's spine ──
   const uiFiles = statSync(uiDir).isDirectory() ? readdirSync(uiDir).filter((f) => f.endsWith(".ts")) : [];
  const need = ["overlay.ts", "gate0-face.ts", "keymap.ts", "twin.ts"];
  const missing = need.filter((n) => !uiFiles.includes(n));
  checks.push({
      name: "overlay modules present (E1/E2/§D6/E4)",
      ok: missing.length === 0,
      detail: missing.length === 0 ? "overlay + gate0-face + keymap + twin present" : `missing ${missing.join(", ")}`,
     });

  const indexSrc = fileExists(DEFAULT_DEPS.index) ? readFileSync(DEFAULT_DEPS.index, "utf8") : "";
  const wiredOverlay =
     /renderOverlay\b/.test(indexSrc) && /renderGate0Face\b/.test(indexSrc) && /buildProgramWalk\b/.test(indexSrc);
  checks.push({
     name: "kiln/index.ts exports the overlay (on top of r1's spine)",
     ok: wiredOverlay,
      detail: wiredOverlay ? "overlay / gate0-face / program-walk exported" : "index does not export the overlay pieces",
     });

    // r1's spine must still be ready (OverlayCReady composes ON runtime-ready).
  const spine = await checkRuntimeReady(); // r7: async spine — un-awaited, `spine.ready` would be undefined
  checks.push({
       name: "r1 spine runtime-ready (composes on runtime-ready)",
       ok: spine.ready,
        detail: spine.ready
        ? "lane/gate/writer/scheduler/ui + a green dogfood"
         : `spine gap: ${spine.checks.find((c) => !c.ok)?.detail ?? "unknown"}`,
      });

     // ── (b) deterministic render ──
  const s = overlayState();
  const render = override.brokenRender ? renderOverlay(s) + `\nNONDET@${process.pid}` : renderOverlay(s);
  const render2 = renderOverlay(JSON.parse(JSON.stringify(s)) as FactoryState);
  const deterministic = render === render2 && !override.brokenRender;
  checks.push({
      name: "overlay renders deterministically (one source of truth, SC-005)",
      ok: deterministic,
       detail: deterministic ? "an identical captured state ⇒ a byte-identical overlay" : "a non-deterministic overlay render (broken)",
      });

      // ── (b) a headless Gate 0 BLOCKS (prints + WAITs; never auto-advances) ──
  const raised = onEvent(s, { kind: "gate0_open" });
  const blocks = disabledUi(raised).blocks;
  checks.push({
      name: "a headless Gate 0 blocks (F-GATE0-BLOCK, P-V/P-VI)",
       ok: blocks,
        detail: blocks ? "overlay absent ⇒ Gate 0 prints + WAITs, never auto-advances" : "a headless Gate 0 did not block",
       });

        // ── (b) F1: Gate 0 admits NO recorded exception (a pre-delegation is refused) ──
  let f1Refused = false;
  try {
    recordGate0Decision(roadHead(), { move: "approve", decidedBy: "spec #42 approved T (pre-delegation)" });
       } catch {
    f1Refused = true; // the producer refused the non-human decider
       }
  const f1Ok = f1Refused && !override.brokenGate0;
  checks.push({
        name: "Gate 0 admits no recorded exception (F1: human-only, P-VI)",
        ok: f1Ok,
        detail: f1Ok
         ? "a pre-delegated gate-0 is REFUSED; only a human decider admits Gate 0"
          : override.brokenGate0
           ? "a Gate-0 auto-advance hole is OPEN (F1 bypassed — FALSIFIED ON PURPOSE)"
            : "a non-human decider was accepted at Gate 0",
       });

       // ── (b/SC-003) closed-row program walk PASSES log.ts; a broken auto-approve FAILs R3, named ──
  const goodWalk = validateLog(parse(buildProgramWalk({ gate0By: "human@batorfi" }).lines), JSON.parse(readFileSync(DEFAULT_DEPS.schema, "utf8")));
  checks.push({
       name: "a closed-row program walk PASSES 001's log.ts (SC-003)",
        ok: goodWalk.valid,
         detail: goodWalk.valid ? `PASS (${parse(buildProgramWalk({}).lines).length} records, R1–R6)` : `named gap: ${goodWalk.failures[0]}`,
       });
  const badWalk = validateLog(parse(buildProgramWalk({ brokenAutoApprove: true }).lines), JSON.parse(readFileSync(DEFAULT_DEPS.schema, "utf8")));
  const badNamedR3 = !badWalk.valid && /R3/.test(badWalk.failures.join("\n"));
  checks.push({
        name: "a broken auto-approve of Gate 0 FAILs log.ts with a named R3 (SC-002→SC-003)",
        ok: badNamedR3,
         detail: badNamedR3 ? `broken path FAILs: ${badWalk.failures[0]}` : "the broken path did not fail R3 (guard missing)",
       });

        // ── (c) no cloud (P-VIII) — a zero-network scan over the overlay set ──
  // r7: the SHARED scan. The inline copy scanned ui/contracts/validate but NEVER `src` (where residents live).
  const netScan = zeroNetworkScan(
    SCAN_DIRS.map((d) => fileURLToPath(new URL(`../${d}`, import.meta.url))),
    "no external dep; no socket/server (P-VIII)",
  );
  checks.push({ name: "zero-network (P-VIII)", ok: netScan.ok, detail: netScan.detail });

     // traceability note (the runtime analogue of FR-009 / r1's SC-006).
  checks.push({
        name: "traceability note (FR-013 analogue)",
        ok: true,
         detail: "E1/E3 P-IX (event-only render) · E2/E4 P-V/P-VI (Gate 0 human-only) · E6 P-VIII (no cloud)",
       });

  return { ready: checks.every((c) => c.ok), checks };
}

export async function reportOverlayReady(override: OverlayReadyOverride = {}): Promise<string> {
  const r = await checkOverlayReady(override);
  if (r.ready) {
   return [PASS, "OverlayCReady — Layer C is drawn: deterministic, a blocking headless Gate 0, cloud-free:", ...r.checks.map((c) => `    ✓ ${c.name}: ${c.detail}`)].join("\n");
       }
  return r.checks.filter((c) => !c.ok).map((c) => fmt(c.name, c.detail)).join("\n");
}

// ── CLI (T022): `node kiln/validate/overlay-ready.ts [--broken-render | --broken-gate0]` ──
function isMain(): boolean {
  try {
    return process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1];
      } catch {
    return false;
     }
}
if (isMain()) {
  runCli(async () => {
    const ov: OverlayReadyOverride = {
      brokenRender: process.argv.includes("--broken-render"),
      brokenGate0: process.argv.includes("--broken-gate0"),
    };
    const r = await checkOverlayReady(ov);
    if (r.ready) {
      console.log(await reportOverlayReady(ov));
      return 0;
    }
    console.error(await reportOverlayReady(ov));
    return 1;
  });
}
