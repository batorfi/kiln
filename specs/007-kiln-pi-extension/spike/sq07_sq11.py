#!/usr/bin/env python3
"""SQ7 + SQ11 (T010). Real Pi, hermetic, no model.
SQ7  — is `confirm`'s `false` conflated? Compare 'answered NO' vs 'cancelled' vs 'timed out' (rpc) and headless (json/print) against `select`.
SQ11 — where does an extension's console.log / process.stdout.write / console.error go in `rpc`? (print/json: measured earlier — stderr; see sq04/README.)
"""
import os, sys, time, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pirpc import PiRpc, headless, readlog
HERE = os.path.dirname(os.path.abspath(__file__))
MATRIX, OUT = os.path.join(HERE, "matrix-ext.ts"), os.path.join(HERE, "out-ext.ts")
LOG = os.path.join(tempfile.mkdtemp(prefix="kiln-sq07-"), "log.jsonl")

def logged(cmd, timeout=10):
    end = time.time() + timeout
    while time.time() < end:
        for r in readlog(LOG):
            if r["cmd"] == cmd: return r
        time.sleep(0.05)

def rpc_value(cmd, method, reply=None):
    if os.path.exists(LOG): os.remove(LOG)
    p = PiRpc(ext=MATRIX, env={"KP_LOG": LOG}, deadline=30)
    try:
        p.send({"type": "prompt", "id": "pp", "message": f"/{cmd}"})
        req = p.ui(method, 8)
        if req is not None and reply is not None: p.answer(req, **reply)
        r = logged(cmd, 10); return None if r is None else r["result"]
    finally: p.close()

print("## SQ7 — `select` vs `confirm`: which values does each produce for the SAME human situations?")
sel = {"answered 'a'": rpc_value("m-select", "select", {"value": "a"}), "cancelled": rpc_value("m-select", "select", {"cancelled": True}),
       "timed out": rpc_value("m-select-t", "select")}
con = {"answered YES": rpc_value("m-confirm", "confirm", {"confirmed": True}), "answered NO": rpc_value("m-confirm", "confirm", {"confirmed": False}),
       "cancelled": rpc_value("m-confirm", "confirm", {"cancelled": True}), "timed out": rpc_value("m-confirm-t", "confirm")}
for m in ("json", "print"):
    if os.path.exists(LOG): os.remove(LOG)
    headless(m, MATRIX, "/m-confirm", env={"KP_LOG": LOG}); con[f"headless ({m})"] = (logged("m-confirm", 2) or {}).get("result")
    if os.path.exists(LOG): os.remove(LOG)
    headless(m, MATRIX, "/m-select", env={"KP_LOG": LOG}); sel[f"headless ({m})"] = (logged("m-select", 2) or {}).get("result")
print("select :", sel); print("confirm:", con)
no_like = [k for k, v in con.items() if v is False]
print(f"\nconfirm returns False for ALL of: {no_like}  → a `false` cannot tell an explicit NO from silence.")
print("select returns a STRING only for an explicit choice; every non-answer is:", {k: v for k, v in sel.items() if v != 'a'})

print("\n## SQ11 — output channels in `rpc`")
p = PiRpc(ext=OUT, deadline=30)
try:
    p.send({"type": "prompt", "id": "pp", "message": "/o-out"})
    time.sleep(2.0)
    nonjson = [o["raw"] for o in p.events if o.get("type") == "_nonjson"]
    notified = [o.get("message") for o in p.events if o.get("type") == "extension_ui_request" and o.get("method") == "notify"]
    print("Pi stdout, NOT JSON (would corrupt the protocol):", nonjson)
    print("Pi stdout, notify requests:", notified)
    print("Pi stderr:", p.stderr_lines)
finally: p.close()
