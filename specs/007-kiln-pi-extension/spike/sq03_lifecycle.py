#!/usr/bin/env python3
"""SQ3 (T011) — what session changes do to a registered extension. Real Pi, hermetic, no model. Prints labelled facts; nothing is asserted here
(the findings are recorded in research.md Part B).  Uses a temp --session-dir (so `new_session` works) instead of --no-session."""
import json, os, sys, tempfile, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pirpc import PiRpc, readlog
EXT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "life-ext.ts")
LOG = os.path.join(tempfile.mkdtemp(prefix="kiln-sq03-"), "log.jsonl")
strip = lambda es: [{k: v for k, v in e.items() if k != "t"} for e in es]
names = lambda p: [c["name"] for c in p.commands() if c["name"].startswith("l-")]
def cmd(p, c): p.send({"type": "prompt", "id": f"x{time.time()}", "message": f"/{c}"}); time.sleep(0.6)

p = PiRpc(ext=EXT, env={"KP_LOG": LOG}, sessions=True, deadline=90)
try:
    print("A. commands at start:", names(p))
    cmd(p, "l-ping"); cmd(p, "l-ping")
    r = p.call("new_session"); print("B. new_session ->", r["data"] if r else None)
    time.sleep(0.5); cmd(p, "l-ping")
    print("C. commands after new_session (renamed? doubled?):", names(p))
    print("D. log across new_session:"); [print("    ", e) for e in strip(readlog(LOG))]
    print("   → read: `factory` runs AGAIN after session_shutdown; module-level state (moduleCounter) SURVIVES; `session_start` fires once per accumulated handler.")

    open(LOG, "w").close()
    p.send({"type": "prompt", "id": "r", "message": "/reload"}); time.sleep(2.0)
    print("E. /reload via RPC prompt — events logged:", strip(readlog(LOG)) or "NONE (no factory re-run, no session events: not observable over RPC → T)")

    sf = (p.call("get_state") or {}).get("data", {}).get("sessionFile")
    print("F. sessionFile exists on disk before any assistant turn?", os.path.exists(sf) if sf else None)
    print("   clone ->", (p.call("clone") or {}).get("error", "ok"))
    print("   switch_session(<that path>) ->", (p.call("switch_session", sessionPath=sf) or {}).get("error", "ok"))
    print("   → fork / clone / switch_session need a SAVED session, i.e. a first assistant response: not reachable without a model (→ T / needs a model).")

    open(LOG, "w").close()
    p.send({"type": "prompt", "id": "a", "message": "/l-ask"})
    req = p.ui("select", 8)
    r = p.call("new_session", timeout=6)
    print("G. new_session while a dialog is PENDING ->", r["data"] if r else "NO RESPONSE")
    time.sleep(0.5); before = strip(readlog(LOG))
    if req: p.answer(req, value="approve")
    time.sleep(1.0); after = strip(readlog(LOG))
    print("   log before the late answer:", before); print("   log after  the late answer:", after[len(before):])
    print("   → an orphaned dialog answered AFTER a session switch IS DELIVERED to the stale handler:",
          any(e.get("event") == "ask-result" for e in after))
finally:
    p.close()
