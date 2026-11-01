// r16 T003 — trivial marker so `tests/package-resolves.test.ts` can prove `#workers/*` resolves now
// that this package has real content. No behaviour: deleted once a real module exercises the import
// path (T006 onward).
export const WORKERS_PACKAGE_MARKER = "workers";
