#!/usr/bin/env python3
"""SQ9 (T012) — what an EMPTY-config Pi says about models. MEASURE ONLY: how Pi's session model relates to KILN's Ollama resident is r10's decision.
Real Pi, hermetic (empty PI_CODING_AGENT_DIR), no model called."""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pirpc import PiRpc

p = PiRpc(deadline=40)
try:
    st = (p.call("get_state") or {}).get("data", {})
    print("get_state.model:", json.dumps(st.get("model")))
    r = p.call("get_available_models")
    models = ((r or {}).get("data") or {}).get("models", [])
    print("get_available_models: success =", (r or {}).get("success"), "· count =", len(models))
    print("  providers:", sorted({m.get("provider") for m in models}) or "none")
    print("  any local-looking base URL:", [m.get("baseUrl") for m in models if "localhost" in str(m.get("baseUrl")) or "127.0.0.1" in str(m.get("baseUrl"))][:5] or "none")
    print("commands:", [(c["name"], c.get("source"), (c.get("sourceInfo") or {}).get("origin")) for c in p.commands()])
    print("→ in an empty config Pi has NO usable session model; an Ollama-backed Pi session model would need Pi-side provider config (not KILN's resident).")
finally:
    p.close()
