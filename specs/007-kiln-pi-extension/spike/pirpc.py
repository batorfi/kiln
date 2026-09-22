"""THROWAWAY spike harness (r8 / spec 007, T008) — not part of the KILN toolchain, never shipped or scanned.

A hermetic client for a REAL `pi --mode rpc`. It calls NO model and touches NO operator config:
  * PI_CODING_AGENT_DIR = a fresh empty temp dir (removed in `close()`), so the operator's ~/.pi is never read or written
  * --offline + PI_OFFLINE=1, -ne (no extension discovery; explicit -e only)
  * a hard deadline that KILLS Pi, so a wedged run can never hang the script
Extension commands are handled before the LLM, so `prompt` with a slash command needs no model (measured 2026-09-21: ~0.2 s).
"""
import json, os, shutil, subprocess, tempfile, threading, time

PI = os.environ.get("KILN_PI_BIN", "pi")


class PiRpc:
    def __init__(self, ext=None, extra_args=(), env=None, cwd=None, deadline=40, sessions=False):
        self.dir = tempfile.mkdtemp(prefix="kiln-spike-")
        self.events, self.cv, self.cursor, self.stderr_lines = [], threading.Condition(), 0, []
        args = [PI, "--mode", "rpc", "--offline", "-ne"]
        args += ["--session-dir", os.path.join(self.dir, "sessions")] if sessions else ["--no-session"]
        if ext: args += ["-e", ext]
        args += list(extra_args)
        e = {**os.environ, "PI_CODING_AGENT_DIR": os.path.join(self.dir, "agent"), "PI_OFFLINE": "1", **(env or {})}
        os.makedirs(e["PI_CODING_AGENT_DIR"], exist_ok=True)
        self.p = subprocess.Popen(args, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, cwd=cwd or self.dir, env=e)
        threading.Thread(target=self._read, daemon=True).start()
        threading.Thread(target=self._read_err, daemon=True).start()
        threading.Thread(target=lambda: (time.sleep(deadline), self.p.kill()), daemon=True).start()
        self._n = 0
        self._answered = set()

    def _read(self):
        for line in self.p.stdout:
            try: o = json.loads(line)
            except Exception: o = {"type": "_nonjson", "raw": line.rstrip("\n")}
            with self.cv: self.events.append(o); self.cv.notify_all()

    def _read_err(self):
        for line in self.p.stderr: self.stderr_lines.append(line.rstrip("\n"))

    def send(self, obj):
        self.p.stdin.write(json.dumps(obj) + "\n"); self.p.stdin.flush()

    def call(self, cmd, timeout=10, **kw):
        self._n += 1; cid = f"c{self._n}"
        self.send({"type": cmd, "id": cid, **kw})
        return self.wait(lambda o: o.get("type") == "response" and o.get("id") == cid, timeout)

    def wait(self, pred, timeout=10):
        """The next event (from the cursor) matching `pred`, or None on timeout."""
        end = time.time() + timeout
        with self.cv:
            while True:
                while self.cursor < len(self.events):
                    o = self.events[self.cursor]; self.cursor += 1
                    if pred(o): return o
                left = end - time.time()
                if left <= 0: return None
                self.cv.wait(left)

    def ui(self, method, timeout=10):
        """The first not-yet-answered `extension_ui_request` for `method`, searching ALL events (Pi may emit the request BEFORE it
        answers the `prompt` that caused it, so a cursor that already moved past it would miss it)."""
        end = time.time() + timeout
        with self.cv:
            while True:
                for o in self.events:
                    if o.get("type") == "extension_ui_request" and o.get("method") == method and o["id"] not in self._answered:
                        return o
                left = end - time.time()
                if left <= 0: return None
                self.cv.wait(left)

    def answer(self, req, **fields):
        self._answered.add(req["id"])
        self.send({"type": "extension_ui_response", "id": req["id"], **fields})

    def commands(self):
        r = self.call("get_commands")
        return r["data"]["commands"] if r and r.get("success") else []

    def close(self):
        try: self.p.kill()
        except Exception: pass
        shutil.rmtree(self.dir, ignore_errors=True)


def headless(mode, ext, message, env=None, timeout=40):
    """Run ONE slash command in `-p` (mode='print') or `--mode json` (mode='json'). Returns (rc, stdout, stderr, seconds)."""
    d = tempfile.mkdtemp(prefix="kiln-spike-")
    e = {**os.environ, "PI_CODING_AGENT_DIR": os.path.join(d, "agent"), "PI_OFFLINE": "1", **(env or {})}
    os.makedirs(e["PI_CODING_AGENT_DIR"], exist_ok=True)
    args = [PI] + (["-p"] if mode == "print" else ["--mode", "json"]) + ["-ne", "--no-session", "--offline", "-e", ext, message]
    t0 = time.time()
    try:
        r = subprocess.run(args, capture_output=True, text=True, timeout=timeout, cwd=d, env=e, stdin=subprocess.DEVNULL)
        return r.returncode, r.stdout, r.stderr, time.time() - t0
    finally:
        shutil.rmtree(d, ignore_errors=True)


def readlog(path):
    try: return [json.loads(l) for l in open(path) if l.strip()]
    except FileNotFoundError: return []
