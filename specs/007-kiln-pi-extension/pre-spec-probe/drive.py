#!/usr/bin/env python3
"""THROWAWAY pre-spec probe driver. Usage: drive.py answer|cancel|silent
Starts a REAL `pi --mode rpc` (no model is called: an extension command bypasses the LLM), runs /kiln-probe and plays the
human on stdin. `PI_CODING_AGENT_DIR` points at an empty temp dir so the user's own Pi config is never read."""
import json, os, subprocess, sys, tempfile, threading, time
mode = sys.argv[1] if len(sys.argv) > 1 else "answer"
here = os.path.dirname(os.path.abspath(__file__))
env = {**os.environ, "PI_CODING_AGENT_DIR": tempfile.mkdtemp(prefix="kiln-pi-probe-")}
p = subprocess.Popen(["pi", "--mode", "rpc", "-ne", "--no-session", "--offline", "-e", os.path.join(here, "ext.ts")],
                     stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, cwd=here, env=env)
threading.Thread(target=lambda: (time.sleep(20), p.kill()), daemon=True).start()
def send(o): p.stdin.write(json.dumps(o) + "\n"); p.stdin.flush()
send({"type": "prompt", "id": "p1", "message": "/kiln-probe"})
t0 = time.time()
for line in p.stdout:
    o = json.loads(line)
    if o.get("type") != "extension_ui_request": continue
    if o["method"] == "select" and mode != "silent":  # "silent" = nobody answers; Pi's own timeout resolves it
        send({"type": "extension_ui_response", "id": o["id"], **({"value": "approve"} if mode == "answer" else {"cancelled": True})})
    if o["method"] == "notify":
        m = o["message"]; print(m if not m.startswith("FACTS") else m.replace('\\"', '"'))
        if m.startswith("CUSTOM_RESULT"): break
p.kill(); print(f"[{mode}] {time.time()-t0:.1f}s")
