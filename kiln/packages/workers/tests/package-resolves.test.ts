// r16 T003 — a trivial probe that `#workers/*` resolves via kiln/package.json's imports map, now that
// packages/workers/src/ exists for the first time (the stub before this row had kiln.json only).
import { test } from "node:test";
import assert from "node:assert/strict";
import { WORKERS_PACKAGE_MARKER } from "#workers/marker.ts";

test("#workers/* resolves to packages/workers/src/*", () => {
  assert.equal(WORKERS_PACKAGE_MARKER, "workers");
});
