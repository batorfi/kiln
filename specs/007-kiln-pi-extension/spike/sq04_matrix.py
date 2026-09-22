#!/usr/bin/env python3
"""SQ4 (T009) — measure every reachable ctx.ui cell in rpc / json / print. Real Pi, hermetic, no model. Prints a markdown table."""
import os, sys, time, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pirpc import PiRpc, headless, readlog

EXT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "matrix-ext.ts")
LOG = os.path.join(tempfile.mkdtemp(prefix="kiln-sq04-"), "log.jsonl")
rows = []

def logged(cmd, timeout=10):
    end = time.time() + timeout
    while time.time() < end:
        for r in readlog(LOG):
            if r["cmd"] == cmd: return r
        time.sleep(0.05)
    return None

def fmt(r):
    if r is None: return "NO LOG (handler did not finish)"
    v = r["result"]; s = repr(v) if not isinstance(v, str) else f'"{v}"'
    return f'{s} · {r["ms"]} ms' + (f' · ERR {r["err"]}' if r.get("err") else "")

# ---------------- rpc ----------------
def rpc_case(label, cmd, reply=None, wait_method=None, silent=False):
    if os.path.exists(LOG): os.remove(LOG)
    p = PiRpc(ext=EXT, env={"KP_LOG": LOG}, deadline=30)
    try:
        # NOTE (measured): Pi answers `prompt` only AFTER the slash command's handler finishes, and a handler blocked on a dialog cannot finish until
        # WE answer it — so never wait for the prompt response before answering. Send it, answer, then read the log.
        p.send({"type": "prompt", "id": "pp", "message": f"/{cmd}"})
        note = ""
        if wait_method:
            req = p.ui(wait_method, 8)
            if req is None: note = f"(no {wait_method} request seen) "
            elif not silent and reply is not None: p.answer(req, **reply)
        r = logged(cmd, 10)
        # for fire-and-forget methods, which ui requests did Pi emit?
        emitted = sorted({o.get("method") for o in p.events if o.get("type") == "extension_ui_request"})
        rows.append(("rpc", label, note + fmt(r) + f" · ui-requests: {','.join(emitted)}"))
    finally:
        p.close()

rpc_case("select — answered 'a'", "m-select", {"value": "a"}, "select")
rpc_case("select — cancelled", "m-select", {"cancelled": True}, "select")
rpc_case("select — timeout 1500 ms, client silent", "m-select-t", None, "select", silent=True)
rpc_case("confirm — answered yes", "m-confirm", {"confirmed": True}, "confirm")
rpc_case("confirm — answered NO", "m-confirm", {"confirmed": False}, "confirm")
rpc_case("confirm — cancelled", "m-confirm", {"cancelled": True}, "confirm")
rpc_case("confirm — timeout 1500 ms, client silent", "m-confirm-t", None, "confirm", silent=True)
rpc_case("notify", "m-notify")
rpc_case("setStatus (set, then clear)", "m-status")
rpc_case("custom({overlay:true})", "m-custom")

# ---------------- json / print ----------------
for mode in ("json", "print"):
    for cmd, label in (("m-select", "select"), ("m-confirm", "confirm"), ("m-notify", "notify"), ("m-status", "setStatus"), ("m-custom", "custom({overlay:true})")):
        if os.path.exists(LOG): os.remove(LOG)
        rc, out, err, secs = headless(mode, EXT, f"/{cmd}", env={"KP_LOG": LOG})
        r = logged(cmd, 2)
        rows.append((mode, label, fmt(r) + f" · exit {rc} · stdout {len(out)} B · stderr {len(err)} B · {secs:.1f}s total"))

print("| mode | cell | result |\n|---|---|---|")
for m, l, v in rows: print(f"| {m} | {l} | {v} |")
