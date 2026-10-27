// Test support: a FAKE owner — it takes the socket path of a store and then does what a broken owner does: `silent` accepts requests and never answers, `drop` accepts a request and closes the
// connection. It lets the client's "outcome unknown within 5 s" rule be proven without any dependence on the real owner's timing. Prints `LISTENING` once bound.
//   node silent-owner.ts <silent|drop> <socket path>
import { mkdirSync, unlinkSync } from "node:fs";
import net from "node:net";
import { dirname } from "node:path";

const [mode, path] = process.argv.slice(2);
mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
try { unlinkSync(path); } catch { /* none there */ }
const server = net.createServer((s) => {
  s.on("error", () => {});
  s.on("data", () => { if (mode === "drop") s.destroy(); });
});
server.listen(path, () => console.log("LISTENING"));
