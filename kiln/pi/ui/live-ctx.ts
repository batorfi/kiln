// kiln/pi/ui/live-ctx.ts — T011/T016/T021/T025, r9 · FR-002–FR-010, FR-012 · contracts/live-ctx-seam.md L1–L7 · data-model E4–E6.
//
// The real `LiveUICtx` (NC2 = A): implements r3's EXISTING interface (`ui/live-tui.ts`, unmodified) against Pi's measured `ctx.ui` shapes.
// `setStatus` is a PURE PASSTHROUGH to Pi's real `ctx.ui.setStatus(key, text)` (research D9's resolution of the mockup review's open
// item — a genuine, distinct fire-and-forget method for "a status entry in the footer/status bar," `docs/rpc.md` "setStatus" — NOT
// `ctx.ui.notify`, which is for one-off messages; `setStatus` is declared LOCALLY here, the same way `keys.ts` declares `ShortcutApi`,
// since `port.ts`'s canonical `PiUi` does not carry it and this row does not touch `port.ts`, contra r8's own original projection — see
// `pi/README.md`'s correction). It does NOT re-derive the presentation transform; the CALLER is responsible for having already applied
// `present.ts` to whatever it passes in (keeps `LiveUICtx`'s one-argument shape, NC2 = A, and matches T010's own contract: "setStatus
// itself does not re-derive it"). Where `ctx.hasUI` is false (print/json), falls back to `emit()` — the same mode-aware channel
// `kiln-status`/`kiln-selftest` already use, since `setStatus` reaches no one there either.
//
// `raiseOverlay("B"|"C", content)` is where the row's real work is: identity is resolved ONCE, BEFORE any question is built (L2). The
// VISIBLE overlay is drawn via `ctx.ui.custom(...)`, a DISMISS-ONLY component (Enter/Esc -> done(undefined)) — the exact, already-measured,
// already-tested shape r8's `kiln-selftest` proved works and can CLOSE (F-1's lesson). The actual CHOICE, when one is needed, is made via
// `askGate`/`interpret` (r8's seam, imported, never re-implemented) — measured (M5, port.ts) to be the ONLY mechanism that resolves to a
// real answer under RPC: `ctx.ui.custom()` resolves `undefined` with NO `handleInput` ever invoked in `rpc` mode, so a decision built ONLY
// on a custom-overlay's own list-navigation could never be proven by `UiReady` (which runs in RPC mode only, contract `ui-ready.md` U1) —
// this is a considered, documented departure from research D5's more aspirational framing ("the overlay IS the select"), made because the
// RPC-testability requirement (U1) is a harder, already-measured constraint. `askGate` never carries a `timeout` (its own shape has none —
// FR-008); the overlay component never carries one either.
//
// Mutual exclusion (L5, FR-008): `OverlayState` (E4, private to this module) tracks which layer is in flight. A raise for a DIFFERENT layer
// evicts the current one FIRST — its pending `custom()`/`askGate` step resolves as a cancellation, which flows through `interpret` as
// `no-answer` -> `headlessWait`, exactly like a real Esc (never a move). A raise for the SAME layer while one is already pending updates that
// SAME overlay's visible content in place (L4a, FR-009) — it never opens a second dialog.
import type { PiCtx, GateQuestion } from "../port.ts";
import { askGate, interpret } from "../outcome.ts";
import { detectCapability } from "../port.ts";
import { emit } from "../output.ts";
import { applyMove, headlessWait, moveVocabulary, type Gate } from "../../src/gate.ts";
import { recordGate0Decision, GATE0_ADMISSION_MOVES } from "../../ui/gate0-face.ts";
import type { RoadmapHead } from "../../src/types.ts";
import type { LiveUICtx } from "../../ui/live-tui.ts";
import { resolveIdentity, type IdentityResult } from "./identity.ts";

export interface LiveUICtxOverrides {
  /** Injectable for tests only — mirrors r8's `KilnExtensionOverrides.interpret` pattern. */
  resolveIdentity?: () => IdentityResult;
}

/** Pi's real `ctx.ui.setStatus(key, text)` (`docs/rpc.md` "setStatus") — kept LOCAL, never added to `port.ts`'s canonical `PiUi`. */
interface StatusUi {
  setStatus(key: string, text: string | undefined): void;
}

/** One key for KILN's own footer entry — `undefined` text clears it (Pi's own contract; unused here, Layer A never clears itself). */
const STATUS_KEY = "kiln";

/**
 * Enter or Esc, in any form Pi can deliver them. Pi switches the terminal to the Kitty keyboard protocol when it is supported (Ghostty,
 * and so cmux, does), and then Esc arrives as `ESC[27u`, never a bare ESC — a check for `"\x1b"` alone leaves the card unclosable (the
 * same bug class as r8's F-1). Key-RELEASE events (`:3`) and modified presses are ignored. Kept local: nothing here may import Pi.
 */
export function isDismissKey(data: string): boolean {
  if (data === "\r" || data === "\n" || data === "\x1b") return true;
  const m = /^\x1b\[(?:13|27|57414)(?:;(\d+)(?::(\d))?)?u$/.exec(data);
  if (!m) return false;
  const modifier = m[1] === undefined ? 1 : Number(m[1]);
  const eventType = m[2] === undefined ? 1 : Number(m[2]);
  return modifier === 1 && eventType !== 3;
}

interface OverlayState {
  layer: "B" | "C" | null;
  content: string;
  /** Set while this layer's flow is in flight; calling it makes that flow resolve as a cancellation (L5). */
  evict: (() => void) | null;
  /** Set while a `custom()` overlay for this layer is open; updates the SAME overlay's content in place (L4a) — never a second dialog. */
  refresh: ((content: string) => void) | null;
}

/**
 * `makeLiveUICtx` implements r3's `LiveUICtx` (E5) against a real Pi `ctx`. `gate` is the CURRENT per-gate 1–9 `Gate` this instance answers
 * Layer B questions for (bound by whoever constructs this — a future r11 director); `head` is the `RoadmapHead` Layer C reads for its
 * gate0/plain-table branch. Both are optional so `setStatus`-only usage (T010) needs neither.
 */
export function makeLiveUICtx(piCtx: PiCtx, gate?: Gate, head?: RoadmapHead, overrides: LiveUICtxOverrides = {}): LiveUICtx {
  const state: OverlayState = { layer: null, content: "", evict: null, refresh: null };
  // A Gate-0 `Wait` tracking object, internal to this instance (r9 does not wire a real director's own gate0 bookkeeping — see
  // implementation-report.md). `headlessWait`/`applyMove`'s shapes both accept `"gate0"` as a valid `GateId` (r1's own union).
  const gate0Track: Gate = { id: "gate0", open: true };
  const doResolveIdentity = overrides.resolveIdentity ?? (() => resolveIdentity());

  function evictCurrent(): void {
    state.evict?.();
    state.layer = null;
    state.evict = null;
    state.refresh = null;
  }

  /**
   * Draw `content` as a dismiss-only overlay (r8's proven, closable shape: Enter/Esc -> `done(undefined)`, never hangs — T015, F-1's
   * lesson). Resolves on WHATEVER makes Pi's own `custom()` promise settle: a real Enter/Esc in `tui`, or — measured, M5 — an IMMEDIATE
   * `undefined` resolution in `rpc` with `handleInput` never invoked at all. Either way, this function must not stall the flow: it awaits
   * Pi's own promise directly, racing it against `cancelSignal` (L5's eviction).
   */
  function showDismissableOverlay(contentBox: { text: string }, cancelSignal: Promise<"evicted">): Promise<"dismissed" | "evicted"> {
    const closed = piCtx.ui.custom<unknown>(
      (...args: unknown[]) => {
        const done = args[3] as (v: unknown) => void;
        state.refresh = (next: string) => { contentBox.text = next; }; // L4a: same overlay, content updated in place
        return {
          render: () => contentBox.text.split("\n"),
          invalidate() {},
          handleInput(data: string) {
            if (isDismissKey(data)) done(undefined);
          },
        };
      },
      { overlay: true },
    ).then((): "dismissed" => "dismissed");
    return Promise.race([closed, cancelSignal]);
  }

  /**
   * The shared per-gate flow (L2–L5): resolve identity once; show the card; if identity and capability allow, ask via `askGate`/`interpret`
   * (r8's seam, no timeout); apply the answer via exactly one of `onAnswered`'s two callers (never both) — L4's disjointness by construction.
   */
  async function runGateFlow(opts: {
    layer: "B" | "C";
    content: string;
    question: GateQuestion | null; // null => Layer C's non-interactive plain table (L4)
    waitOn: Gate;
    onAnswered: (option: string, decidedBy: string) => void;
  }): Promise<void> {
    if (state.layer !== null && state.layer !== opts.layer) evictCurrent(); // L5: evict the OTHER layer first

    let cancel!: () => void;
    const cancelSignal = new Promise<"evicted">((resolve) => {
      cancel = () => resolve("evicted");
    });
    state.layer = opts.layer;
    state.content = opts.content;
    state.evict = cancel;
    const contentBox = { text: opts.content };

    const capability = detectCapability(piCtx);

    if (!opts.question) {
      // L4's plain-table branch: no question is EVER built — just the informational card, dismissable.
      if (capability.canDraw) await showDismissableOverlay(contentBox, cancelSignal);
      if (state.layer === opts.layer) { state.layer = null; state.evict = null; state.refresh = null; }
      return;
    }

    const identity = doResolveIdentity();
    if (!identity.ok) {
      // FR-004: a missing/malformed identity is refused with a NAMED error the human can see — never a silent WAIT.
      emit(piCtx, `KILN: this gate cannot be answered — ${identity.reason}. It is now a durable WAIT; nothing was decided.`);
    }

    if (capability.canDraw) {
      const drawResult = await showDismissableOverlay(contentBox, cancelSignal);
      if (drawResult === "evicted") {
        headlessWait(opts.waitOn); // L5: an evicted flow is a no-answer, never a move
        return;
      }
    }

    if (!identity.ok) {
      // L2: identity is resolved BEFORE any question is built. A missing/malformed identity never reaches askGate.
      headlessWait(opts.waitOn);
      if (state.layer === opts.layer) { state.layer = null; state.evict = null; state.refresh = null; }
      return;
    }

    const raw = capability.canAsk
      ? await Promise.race([askGate(piCtx, opts.question), cancelSignal])
      : undefined;
    if (raw === "evicted") {
      headlessWait(opts.waitOn);
      return; // state.layer already reassigned by whichever raise evicted this one
    }
    if (state.layer === opts.layer) { state.layer = null; state.evict = null; state.refresh = null; }

    const outcome = interpret(raw, opts.question.options, capability);
    if (outcome.kind === "answered") opts.onAnswered(outcome.option, identity.decidedBy);
    else headlessWait(opts.waitOn);
  }

  function raiseLayerB(content: string): void {
    if (!gate) throw new Error("makeLiveUICtx: raiseOverlay('B', …) needs a bound per-gate `gate` (none was supplied)");
    const boundGate = gate;
    void runGateFlow({
      layer: "B",
      content,
      question: { title: content, options: moveVocabulary(boundGate.id) },
      waitOn: boundGate,
      onAnswered: (option, decidedBy) => applyMove(boundGate, option, decidedBy),
    });
  }

  function raiseLayerC(content: string): void {
    if (!head) throw new Error("makeLiveUICtx: raiseOverlay('C', …) needs a bound `head` (none was supplied)");
    const boundHead = head;
    const pending = boundHead.gate0.status === "pending";
    void runGateFlow({
      layer: "C",
      content,
      question: pending ? { title: content, options: [...GATE0_ADMISSION_MOVES] } : null,
      waitOn: gate0Track,
      onAnswered: (option, decidedBy) => recordGate0Decision(boundHead, { move: option, decidedBy }),
    });
  }

  return {
    hasUI: piCtx.hasUI,
    setStatus(footer: string): void {
      // a pure passthrough — the caller already applied present.ts (T010); research D9's `ctx.ui.setStatus`, not `notify`.
      if (piCtx.mode === "tui" || piCtx.mode === "rpc") (piCtx.ui as unknown as StatusUi).setStatus(STATUS_KEY, footer);
      else emit(piCtx, footer); // print/json: setStatus reaches no one there either (measured, output.ts's own finding)
    },
    raiseOverlay(layer: "A" | "B" | "C", content?: string | null): void {
      if (content === null || content === undefined) {
        if (state.layer === layer) evictCurrent();
        return;
      }
      if (state.layer === layer) {
        // L4a: the SAME overlay is already pending — update its content in place, never a second dialog.
        state.content = content;
        state.refresh?.(content);
        return;
      }
      if (layer === "B") raiseLayerB(content);
      else if (layer === "C") raiseLayerC(content);
      // layer "A" carries no overlay (Layer A is footer-only, via setStatus) — a no-op here, per r3's own contract.
    },
  };
}
