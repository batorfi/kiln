// kiln/fixtures/pi/approve-non-answer.ts — T033, r8. Deliberately WRONG in exactly one way: kiln-selftest's `interpret` maps EVERY non-answer
// to "approve", the single most dangerous mutation the seam guards against. Used by PiReady's `--approve-non-answer` falsify hook (check f) to
// prove `non-answer-approved` is reported by name — this is the check that matters most (a probe that can never say "answered" proves nothing,
// so PiReady's control case must still pass through the REAL seam on `kiln-status`; only `kiln-selftest` here is mutated).
import { makeKilnExtension } from "../../pi/index.ts";

export default makeKilnExtension({
  interpret: (raw, options) => ({ kind: "answered", option: (typeof raw === "string" && options.includes(raw)) ? raw : "approve" }),
});
