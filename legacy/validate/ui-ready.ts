// kiln/validate/ui-ready.ts — T027, r9 · contract `ui-ready.md` · the SIXTH probe: RuntimeReady -> OverlayCReady -> LiveModelReady ->
// OllamaReady -> PiReady -> UiReady.
//
// Composes on `PiReady` conceptually (this row assumes KILN already loads into Pi — it does not re-prove that): it does NOT call
// `checkPiReady()` (which would gate on `MEASURED_PI_VERSIONS`, a fact this probe doesn't need to re-litigate). It drives its own
// hermetic `RpcSession` calls directly (`_pi-driver.ts`, imported, unmodified), against `fixtures/pi/ui-ready-ext.ts` — a FIXTURE
// extension, never the repository's own `specs/ROADMAP.md` (U1). Runs in RPC mode only (U1) — it cannot prove anything about the
// terminal; that is FR-013's human half (`quickstart.md`).
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { openRpc, runHeadless, type RpcSession } from "./_pi-driver.ts";
import { moveVocabulary, GATE_NAME } from "../contracts/move-vocabulary.ts";
import { GATE0_ADMISSION_MOVES } from "../ui/gate0-face.ts";
import { renderHud } from "../ui/hud.ts";
import { LAYERB_KEY, LAYERC_KEY, TOGGLE_KEY, keymapIsConsistent } from "../ui/keymap.ts";
import { fmt, PASS } from "./_report.ts";
import { runCli } from "./_cli.ts";

const KILN_DIR = fileURLToPath(new URL("..", import.meta.url)).replace(/[\\/]$/, "");
const EXT_PATH = join(KILN_DIR, "fixtures", "pi", "ui-ready-ext.ts");
const NO_IDENTITY_EXT = join(KILN_DIR, "fixtures", "pi", "ui-ready-no-identity.ts");
const GATE0_LEAK_EXT = join(KILN_DIR, "fixtures", "pi", "ui-ready-gate0-leak.ts");
const NOT_EXCLUSIVE_EXT = join(KILN_DIR, "fixtures", "pi", "ui-ready-not-exclusive.ts");

export const UI_READY_HOOK_NAMES = ["no-identity", "gate0-vocabulary-leak", "overlay-not-exclusive"] as const;
export type UiReadyHookName = (typeof UI_READY_HOOK_NAMES)[number];

export interface UiReadyHooks {
  noIdentity?: boolean;
  gate0VocabularyLeak?: boolean;
  overlayNotExclusive?: boolean;
}

export interface UiReadyOptions {
  bin?: string;
  hooks?: UiReadyHooks;
}

export interface UiReadyCheck { name: string; ok: boolean; detail: string }
export interface UiReadyFailure { code: string; detail: string }
export interface UiReadyResult { ready: boolean; checks: UiReadyCheck[]; failures: UiReadyFailure[] }

function fail(failures: UiReadyFailure[], code: string, detail: string): void {
  failures.push({ code, detail });
}

/** check (a): a fixture with a known gate id (3) and a known ISO timestamp — presentHud's transforms must both apply. */
function expectedPresentedHud(): string {
  const state = { resident: null, running: null, queue: [], switches: 2, wallClock: "2026-09-24T18:31:12Z", roadmap: [], current: "r9", gate0: { status: "approved" }, gate: { id: 3 } };
  return renderHud(state as any).replace(/\bgate\s*3\b/, GATE_NAME[3]).replace(/2026-09-24T18:31:12Z/, "18:31:12");
}

async function checkStatus(session: RpcSession): Promise<UiReadyCheck> {
  const since = session.promptNoWait("/kiln-ui-status");
  const req = await session.waitForUi("setStatus", 8000, since); // research D9: ctx.ui.setStatus, NOT notify
  const message = (req?.statusText as string | undefined) ?? "";
  const expected = expectedPresentedHud();
  const ok = message === expected;
  return { name: "(a) setStatus carries present.ts's output, not renderHud's raw string", ok, detail: `got="${message}" expected="${expected}"` };
}

/** The first `notify` at/after `since` whose message matches `re` — a gate flow may emit several (e.g. the identity warning, then the outcome line). */
async function waitForNotify(session: RpcSession, re: RegExp, timeoutMs: number, since: number): Promise<string> {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const ev = session.allEvents().slice(since).find((o) => o.type === "extension_ui_request" && o.method === "notify" && re.test(String(o.message ?? "")));
    if (ev) return String(ev.message);
    await new Promise((r) => setTimeout(r, 25));
  }
  return "no-answer:harness-saw-nothing";
}

/** checks (b)/(c): run /kiln-ui-gate over a FRESH session with a controlled KILN_HUMAN env, answered "approve". */
async function runGateOnce(bin: string | undefined, extPath: string, kilnHuman: string | undefined): Promise<{ line: string; warned: boolean }> {
  const priorEnv = process.env.KILN_HUMAN;
  try {
    if (kilnHuman === undefined) delete process.env.KILN_HUMAN;
    else process.env.KILN_HUMAN = kilnHuman;
    const session = openRpc(extPath, { bin });
    try {
      await session.call("get_commands", {}, 10_000); // ensure the extension has loaded before prompting
      const since = session.promptNoWait("/kiln-ui-gate");
      const req = await session.waitForUi("select", 8000, since);
      if (req) session.answer(req, { value: "approve" });
      const line = await waitForNotify(session, /UI-GATE outcome=/, 8000, since);
      const warned = session.allEvents().slice(since).some((o) => o.method === "notify" && /cannot be answered/.test(String(o.message ?? "")));
      return { line, warned };
    } finally {
      session.close();
    }
  } finally {
    if (priorEnv === undefined) delete process.env.KILN_HUMAN;
    else process.env.KILN_HUMAN = priorEnv;
  }
}

async function checkApply(bin: string | undefined, hooks: UiReadyHooks): Promise<UiReadyCheck> {
  const extPath = hooks.noIdentity ? NO_IDENTITY_EXT : EXT_PATH;
  const { line, warned } = await runGateOnce(bin, extPath, "human@ui-ready-fixture");
  const ok = /outcome=applied:approve:human@ui-ready-fixture/.test(line) && !warned;
  return { name: "(b) a valid move + a valid KILN_HUMAN -> exactly one applyMove call with the right decidedBy", ok, detail: line };
}

async function checkNonAnswerApproved(bin: string | undefined, hooks: UiReadyHooks): Promise<UiReadyCheck> {
  const extPath = hooks.noIdentity ? NO_IDENTITY_EXT : EXT_PATH;
  const { line, warned } = await runGateOnce(bin, extPath, undefined); // KILN_HUMAN unset
  // FR-004: the refusal must also be VISIBLE and named — a silent WAIT is indistinguishable from "the list never appeared".
  // (The --no-identity mutant bypasses the identity check entirely, so it never warns; it fails on `outcome` first anyway.)
  const ok = /outcome=waited:/.test(line) && (hooks.noIdentity ? true : warned);
  return { name: "(c) the same, but KILN_HUMAN unset -> NO apply, headlessWait instead, with a visible named refusal", ok, detail: `${line} · warned=${warned}` };
}

async function checkGate0Vocabulary(session: RpcSession): Promise<UiReadyCheck> {
  const since = session.promptNoWait("/kiln-ui-gate0");
  const req = await session.waitForUi("select", 8000, since);
  const options = (req?.options as string[] | undefined) ?? [];
  if (req) session.answer(req, { cancelled: true });
  await session.waitForUi("notify", 8000, since);
  const ok = JSON.stringify([...options].sort()) === JSON.stringify([...GATE0_ADMISSION_MOVES].sort())
    && !options.includes("edit-rows") && !options.includes("add-row") && !options.includes("drop-row");
  return { name: "(d) a Gate-0 question offers ONLY GATE0_ADMISSION_MOVES, never the roadmap-edit moves", ok, detail: `offered=[${options.join(",")}]` };
}

async function checkVocabularyMatch(session: RpcSession): Promise<UiReadyCheck> {
  const since = session.promptNoWait("/kiln-ui-gate");
  const req = await session.waitForUi("select", 8000, since);
  const options = (req?.options as string[] | undefined) ?? [];
  if (req) session.answer(req, { value: "approve" });
  await session.waitForUi("notify", 8000, since);
  const expected = [...moveVocabulary(3)];
  const ok = JSON.stringify(options) === JSON.stringify(expected);
  return { name: "(e) a per-gate question's options match moveVocabulary(gate.id) exactly", ok, detail: `offered=[${options.join(",")}] expected=[${expected.join(",")}]` };
}

async function checkExclusivity(bin: string | undefined, hooks: UiReadyHooks): Promise<UiReadyCheck> {
  const extPath = hooks.overlayNotExclusive ? NOT_EXCLUSIVE_EXT : EXT_PATH;
  const session = openRpc(extPath, { bin });
  try {
    await session.call("get_commands", {}, 10_000);
    const sinceB = session.promptNoWait("/kiln-ui-exclusivity-b");
    const reqB = await session.waitForUi("select", 8000, sinceB);
    const sinceC = session.promptNoWait("/kiln-ui-exclusivity-c");
    const reqC = await session.waitForUi("select", 8000, sinceC);
    if (reqC) session.answer(reqC, { value: "approve" });
    if (reqB) session.answer(reqB, { value: "approve" }); // a LATE answer to the evicted B — must have no effect in the real impl
    const sinceReport = session.promptNoWait("/kiln-ui-exclusivity-report");
    const notify = await session.waitForUi("notify", 8000, sinceReport);
    const line = (notify?.message as string | undefined) ?? "";
    const ok = /gateMove=none/.test(line) && /gateWait=yes/.test(line);
    return { name: "(f) opening B while C is open closes B first — only one KILN overlay's decision ever lands", ok, detail: line };
  } finally {
    session.close();
  }
}

/** check (g): r8's measured non-answer shapes (cancelled, timed out headless mode), replayed through Layer B. */
async function checkNonAnswerShapes(bin: string | undefined): Promise<UiReadyCheck> {
  const results: string[] = [];
  // cancelled, over an RPC session (a real select() dialog, dismissed rather than answered)
  const priorEnv = process.env.KILN_HUMAN;
  try {
    process.env.KILN_HUMAN = "human@ui-ready-fixture";
    const session = openRpc(EXT_PATH, { bin });
    try {
      await session.call("get_commands", {}, 10_000);
      const since = session.promptNoWait("/kiln-ui-gate");
      const req = await session.waitForUi("select", 8000, since);
      if (req) session.answer(req, { cancelled: true });
      const notify = await session.waitForUi("notify", 8000, since);
      results.push((notify?.message as string | undefined) ?? "no-answer:harness-saw-nothing");
    } finally {
      session.close();
    }
  } finally {
    if (priorEnv === undefined) delete process.env.KILN_HUMAN;
    else process.env.KILN_HUMAN = priorEnv;
  }
  // headless (print/json): capability.canAsk is false — headlessWait immediately, no dialog at all
  const p = await runHeadless("print", EXT_PATH, "/kiln-ui-gate", { bin });
  const j = await runHeadless("json", EXT_PATH, "/kiln-ui-gate", { bin });
  results.push(p.stderr.includes("outcome=waited:") ? "waited" : "no-answer:harness-saw-nothing");
  results.push(j.stderr.includes("outcome=waited:") ? "waited" : "no-answer:harness-saw-nothing");
  const ok = results.every((r) => /waited/.test(r));
  return { name: "(g) every measured non-answer shape (cancelled, print, json) -> headlessWait, never applyMove", ok, detail: JSON.stringify(results) };
}

/** check (h): the keymap's three constants — offline, no Pi round trip needed for the Key-Format shape itself. */
function checkKeymap(): UiReadyCheck {
  const KEY_FORMAT = /^(?:ctrl\+|alt\+|shift\+|super\+)+[a-z0-9/]+$/;
  const keys = [LAYERB_KEY, LAYERC_KEY, TOGGLE_KEY];
  const ok = keys.every((k) => KEY_FORMAT.test(k)) && keymapIsConsistent();
  return { name: "(h) LAYERB_KEY/LAYERC_KEY/TOGGLE_KEY match the Key Format and are pairwise distinct", ok, detail: `keys=[${keys.join(",")}]` };
}

export async function checkUiReady(opts: UiReadyOptions = {}): Promise<UiReadyResult> {
  const checks: UiReadyCheck[] = [];
  const failures: UiReadyFailure[] = [];
  const hooks = opts.hooks ?? {};

  const kh = checkKeymap();
  checks.push(kh);
  if (!kh.ok) fail(failures, "keymap-invalid", kh.detail);

  // U1: KILN_HUMAN set to the fixture value for every control case (checks a, d, e, f) — L2 refuses to even build a
  // question without a resolved identity, so these checks would never reach their select() call otherwise. The
  // identity-refusal cases (checks c, part of g) scope their OWN env override around their own session (below).
  const priorKilnHuman = process.env.KILN_HUMAN;
  process.env.KILN_HUMAN = "human@ui-ready-fixture";

  const session = openRpc(EXT_PATH, { bin: opts.bin });
  try {
    await session.call("get_commands", {}, 10_000);

    const a = await checkStatus(session);
    checks.push(a);
    if (!a.ok) fail(failures, "presentation-not-applied", a.detail);

    const e = await checkVocabularyMatch(session);
    checks.push(e);
    if (!e.ok) fail(failures, "vocabulary-mismatch", e.detail);
  } finally {
    session.close();
  }

  // check (d): the leak hook swaps in a DIFFERENT extension file entirely (a fresh session either way).
  const gate0SessionPath = hooks.gate0VocabularyLeak ? GATE0_LEAK_EXT : EXT_PATH;
  const gate0Session = openRpc(gate0SessionPath, { bin: opts.bin });
  try {
    await gate0Session.call("get_commands", {}, 10_000);
    const d = await checkGate0Vocabulary(gate0Session);
    checks.push(d);
    if (!d.ok) fail(failures, "gate0-vocabulary-leak", d.detail);
  } finally {
    gate0Session.close();
  }

  const b = await checkApply(opts.bin, hooks);
  checks.push(b);
  if (!b.ok) fail(failures, "apply-not-called", b.detail);

  const c = await checkNonAnswerApproved(opts.bin, hooks);
  checks.push(c);
  if (!c.ok) fail(failures, "non-answer-approved", c.detail);

  const f = await checkExclusivity(opts.bin, hooks);
  checks.push(f);
  if (!f.ok) fail(failures, "overlay-not-exclusive", f.detail);

  const g = await checkNonAnswerShapes(opts.bin);
  checks.push(g);
  if (!g.ok) fail(failures, "non-answer-approved", g.detail);

  if (priorKilnHuman === undefined) delete process.env.KILN_HUMAN;
  else process.env.KILN_HUMAN = priorKilnHuman;

  return { ready: failures.length === 0, checks, failures };
}

export async function reportUiReady(opts: UiReadyOptions = {}): Promise<string> {
  const r = await checkUiReady(opts);
  if (r.ready) return [PASS, "UiReady — the presentation wrapper, the applied decision and the Gate-0 face are all wired, hermetically, over RPC:", ...r.checks.map((c) => `   ✓ ${c.name}: ${c.detail}`)].join("\n");
  return r.failures.map((f) => fmt(`[${f.code}] `, f.detail)).join("\n");
}

function isMain(): boolean {
  try { return process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]; } catch { return false; }
}
if (isMain()) {
  runCli(async () => {
    const has = (f: string) => process.argv.includes(`--${f}`);
    const hooks: UiReadyHooks = {
      noIdentity: has("no-identity"),
      gate0VocabularyLeak: has("gate0-vocabulary-leak"),
      overlayNotExclusive: has("overlay-not-exclusive"),
    };
    const r = await checkUiReady({ hooks });
    if (r.ready) { console.log(await reportUiReady({ hooks })); return 0; }
    console.error(await reportUiReady({ hooks }));
    return 1;
  });
}

