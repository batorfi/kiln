// A fixture (NOT a *.test.ts, so the default glob skips it): prints the env flags the runner set. Run by scripts.test.ts.
import { test } from "node:test";
test("env probe", () => { console.log(`ENV:live=${process.env.KILN_LIVE ?? "unset"}:cost=${process.env.KILN_LIVE_COST ?? "unset"}`); });
