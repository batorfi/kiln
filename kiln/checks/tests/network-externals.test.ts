// r13 T009 — the external-dependency rule of `kiln check network`: a bare specifier is no longer refused where the BOUNDARY rules open it for the file's own package (one source of truth), and is
// refused everywhere else exactly as before. A seam cannot be used from another package, a different specifier, or a computed import.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { checkNetwork, scanTextDetailed } from "#checks/network-lint.ts";

const rules = JSON.parse(readFileSync(fileURLToPath(new URL("../boundaries.json", import.meta.url)), "utf8"));
const SEAM = new Set<string>(rules.externals["pi-durable"].specifiers);
const scan = (src: string, key: string, seam?: Set<string>) => scanTextDetailed(src, key, [], key, { externalSpecifiers: seam }).map((o) => o.code);

test("a declared specifier in its own package is not an external-dependency offence", () => {
  for (const s of SEAM) assert.deepEqual(scan(`import x from "${s}";\nexport default x;\n`, "packages/durable/src/library/x.ts", SEAM), [], s);
});

test("the same specifier with no seam open (another package) is network-external-dependency, as in the first program", () => {
  for (const s of SEAM) assert.deepEqual(scan(`import x from "${s}";\nexport default x;\n`, "packages/workers/src/x.ts"), ["network-external-dependency"], s);
});

test("an UNDECLARED specifier is refused even inside the seam's own package", () => {
  assert.deepEqual(scan('import l from "left-pad";\nexport default l;\n', "packages/durable/src/library/x.ts", SEAM), ["network-external-dependency"]);
  assert.deepEqual(scan('import p from "@earendil-works/pi-durable/not-declared";\nexport default p;\n', "packages/durable/src/library/x.ts", SEAM), ["network-external-dependency"]);
});

test("a computed import in the seam's package is still refused (the exemption is for literal specifiers only)", () => {
  assert.ok(scan("export const m = await import(name);\n", "packages/durable/src/library/x.ts", SEAM).includes("network-computed"));
});

test("network modules stay refused even where the seam is open: the exemption never reaches node:http and friends", () => {
  assert.ok(scan('import h from "node:http";\nexport default h;\n', "packages/durable/src/library/x.ts", SEAM).includes("network-import"));
});

test("checkNetwork reads the seams from the rules file: the real tree passes; a scratch file in workers with the library is refused through the whole check", () => {
  assert.deepEqual(checkNetwork().failures, []);
  const r = checkNetwork({ externals: rules.externals });
  assert.deepEqual(r.failures, []);
});
