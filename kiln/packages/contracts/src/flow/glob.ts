// The path matcher for `applies_when` rules (research R8, contracts/flow-data.md §3). PURE — `contracts` has no `node:` access — and deliberately tiny: a fixed dialect is what makes
// "the same facts give the same answer" true, and a library matcher would be a new pinned dependency for forty lines.
//
//   `/` separates segments · a segment that is exactly `**` matches any number of whole segments (none included) · `*` matches any characters inside one segment · `?` matches one character
//   inside a segment · anything else is a literal · case-sensitive · `**` inside a longer segment (`a**b`) and the metacharacters `[ ] { } ( ) ! | \` are NOT supported and are reported by name,
//   so a rule can never mean something the matcher did not understand (`kiln check flow` refuses it: flow-glob-unsupported).

const UNSUPPORTED = new Set(["[", "]", "{", "}", "(", ")", "!", "|", "\\"]);
const escapeChar = (c: string): string => (/[.*+?^${}()|[\]\\/]/.test(c) ? `\\${c}` : c);

export type Compiled = { ok: true; test: (path: string) => boolean } | { ok: false; problem: string };

/** Why a pattern is outside the dialect, or `null` when it is inside. */
export function globProblem(pattern: string): string | null {
  if (typeof pattern !== "string" || pattern === "") return "the pattern is empty";
  for (const seg of pattern.split("/")) {
    if (seg.includes("**") && seg !== "**") return `"${seg}": ** must be a whole segment`;
    for (const c of seg) if (UNSUPPORTED.has(c)) return `"${c}" is not part of the glob dialect (only **, *, ? and literals)`;
  }
  return null;
}

/** Compiles one pattern; a pattern outside the dialect is a value (`ok: false`), never a guess. */
export function compileGlob(pattern: string): Compiled {
  const problem = globProblem(pattern);
  if (problem) return { ok: false, problem };
  const segs = pattern.split("/");
  let re = "^";
  segs.forEach((seg, i) => {
    const last = i === segs.length - 1;
    if (seg === "**") {
      re += last ? ".+" : "(?:[^/]+/)*";
      return;
    }
    for (const c of seg) re += c === "*" ? "[^/]*" : c === "?" ? "[^/]" : escapeChar(c);
    if (!last) re += "/";
  });
  re += "$";
  const rx = new RegExp(re);
  return { ok: true, test: (path: string) => rx.test(path) };
}

export function matchGlob(pattern: string, path: string): boolean {
  const c = compileGlob(pattern);
  return c.ok && c.test(path);
}

/** The first (path, pattern) pair that matches, in the order the caller gave them — so the reason text is deterministic. `undefined` when none. */
export function firstMatch(patterns: readonly string[], paths: readonly string[]): { path: string; pattern: string } | undefined {
  const compiled = patterns.map((p) => ({ p, c: compileGlob(p) }));
  for (const path of paths) for (const { p, c } of compiled) if (c.ok && c.test(path)) return { path, pattern: p };
  return undefined;
}
