// A small JS/TS lexer for the checks (r12 T059). Ported from the tokenizer section of the first program's validate/_netscan.ts (CR-4): it replaced
// a regex comment-stripper that a `//` or `/*` inside a STRING could fool into deleting a later `fetch(`. NOT a parser — it understands exactly what
// the checks need: line and block comments, single- and double-quoted strings, template literals (with nested `${ … }` code) and regex literals
// (told apart from division by the previous token). Shared by the network lint and the boundary check, so both read code and not prose.

export interface Tokenized {
  /** Comments removed; string/template TEXT kept (needed for import specifiers and URL literals); regex literals blanked. */
  code: string;
  /** Comments removed; string/template TEXT blanked (so prose in a message never looks like a call); regex literals blanked. */
  blanked: string;
  /**
   * Like `code`, but every character of string and template TEXT is replaced by FILL — same length, same offsets. Patterns that must match the
   * SHAPE of code (`import x from "…"`) run on this, so a whole import statement inside a string never matches; the specifier text is then read
   * from `code` at the same offsets. (Added in r12; `code` and `blanked` are unchanged from the first program.)
   */
  masked: string;
}

const FILL = "\u0001";
const REGEX_PREV = new Set([..."(,=:[!&|?{};+-*%<>~^"]);
const REGEX_KW = new Set(["return", "typeof", "case", "do", "else", "in", "of", "void", "delete", "throw", "new", "yield", "await"]);
const isIdStart = (c: string) => /[A-Za-z_$]/.test(c);
const isIdPart = (c: string) => /[\w$]/.test(c);

export function tokenize(src: string): Tokenized {
  let code = "";
  let blanked = "";
  let masked = "";
  const both = (c: string) => { code += c; blanked += c; masked += c; };
  type Mode = { kind: "code"; braces: number; tpl: boolean } | { kind: "tpl" };
  const modes: Mode[] = [{ kind: "code", braces: 0, tpl: false }];
  const n = src.length;
  let i = 0;
  let lastSig = ""; // last significant (non-space) char emitted in code mode
  let lastWasKeyword = false;

  while (i < n) {
    const m = modes[modes.length - 1];
    const c = src[i];
    const d = src[i + 1];

    if (m.kind === "tpl") {
      if (c === "\\") { code += src.slice(i, i + 2); masked += FILL.repeat(src.slice(i, i + 2).length); i += 2; continue; }
      if (c === "`") { both("`"); modes.pop(); i++; lastSig = "`"; lastWasKeyword = false; continue; }
      if (c === "$" && d === "{") { both("${"); modes.push({ kind: "code", braces: 1, tpl: true }); i += 2; lastSig = "{"; lastWasKeyword = false; continue; }
      code += c; masked += c === "\n" ? c : FILL; if (c === "\n") blanked += c; // template TEXT: kept in `code`, blanked in `blanked`, filled in `masked`
      i++;
      continue;
    }

    // ── code mode ──
    if (c === "/" && d === "/") { while (i < n && src[i] !== "\n") i++; continue; }
    if (c === "/" && d === "*") { const e = src.indexOf("*/", i + 2); i = e < 0 ? n : e + 2; both(" "); continue; }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && src[j] !== c && src[j] !== "\n") j += src[j] === "\\" ? 2 : 1;
      const end = j < n && src[j] === c ? j + 1 : j; // an unterminated string ends at the newline
      const seg = src.slice(i, end);
      code += seg;
      blanked += c + c;
      masked += src[end - 1] === c && seg.length >= 2 ? c + FILL.repeat(seg.length - 2) + c : c + FILL.repeat(seg.length - 1);
      i = end; lastSig = c; lastWasKeyword = false;
      continue;
    }
    if (c === "`") { both("`"); modes.push({ kind: "tpl" }); i++; continue; }
    if (c === "/") {
      const regexAllowed = lastSig === "" || REGEX_PREV.has(lastSig) || (lastWasKeyword && isIdPart(lastSig));
      if (regexAllowed) {
        let j = i + 1; let inClass = false;
        while (j < n && src[j] !== "\n") {
          if (src[j] === "\\") { j += 2; continue; }
          if (src[j] === "[") inClass = true; else if (src[j] === "]") inClass = false;
          else if (src[j] === "/" && !inClass) break;
          j++;
        }
        if (j < n && src[j] === "/") { both("/ /"); i = j + 1; lastSig = "/"; lastWasKeyword = false; continue; }
      }
      both("/"); i++; lastSig = "/"; lastWasKeyword = false; // division
      continue;
    }
    if (c === "{" && m.tpl) m.braces++;
    if (c === "}" && m.tpl && --m.braces === 0) { both("}"); modes.pop(); i++; lastSig = "}"; lastWasKeyword = false; continue; }
    if (isIdStart(c)) {
      let j = i + 1;
      while (j < n && isIdPart(src[j])) j++;
      const id = src.slice(i, j);
      both(id); i = j; lastSig = id[id.length - 1]; lastWasKeyword = REGEX_KW.has(id);
      continue;
    }
    both(c); i++;
    if (!/\s/.test(c)) { lastSig = c; lastWasKeyword = false; }
  }
  return { code, blanked, masked };
}

/** Comments removed; string text kept (for callers that only want comment-stripping). */
export function stripComments(text: string): string {
  return tokenize(text).code;
}

// How a module is named in source. Everything here runs on the MASKED text (shape only: a string, comment or template never looks like code) and reads
// the specifier from `code` at the same offsets. Whitespace is optional wherever the grammar allows it, so `import{a}from"x"` and `import ("x")` read
// exactly like their spaced forms (r12 code-review finding 1).
//   · `import x from "s"`, `import{x}from"s"`, `export * from "s"`, `export{x}from"s"`;
const STATIC_FROM = /(?<![\w$.])(?:import|export)(?![\w$])[^;'"`]*?(?<![\w$.])from\s*["']([^"']+)["']/dg;
//   · `import "s"` (side effect only);
const SIDE_EFFECT = /(?<![\w$.])import\s*["']([^"']+)["']/dg;
//   · `import(…)` and `require(…)` — the argument decides: ONE string literal is a specifier, anything else is a load nobody can read.
const CALL = /(?<![\w$])(?:import|require)\s*\(/dg;
/** The argument starts with exactly one quoted string (or an interpolation-free template) and then `,` or `)` — i.e. it is a literal and nothing is built from it. */
const LITERAL_ARG = /^\s*(?:"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`([^`$\\]*)`)\s*[,)]/;

export interface ModuleLoad {
  /** The module named by a single literal, or null when the load is computed (`import(name)`, `require("a" + b)`, `import(\`x${y}\`)`). */
  specifier: string | null;
  offset: number;
}

/** Every static import/export-from, side-effect import, `import()` and `require()`, in order of appearance — never one that only appears inside a comment, a string or a template. */
export function moduleLoads(t: Tokenized): ModuleLoad[] {
  const out: ModuleLoad[] = [];
  const span = (m: RegExpMatchArray) => (m as RegExpMatchArray & { indices: ([number, number] | undefined)[] }).indices[1]!;
  for (const re of [STATIC_FROM, SIDE_EFFECT]) {
    for (const m of t.masked.matchAll(re)) {
      const [a, b] = span(m);
      out.push({ specifier: t.code.slice(a, b), offset: a });
    }
  }
  for (const m of t.masked.matchAll(CALL)) {
    const at = m.index! + m[0].length;
    const lit = LITERAL_ARG.exec(t.code.slice(at));
    out.push({ specifier: lit ? (lit[1] ?? lit[2] ?? lit[3]) : null, offset: m.index! });
  }
  return out.sort((x, y) => x.offset - y.offset);
}

/** The module specifiers the code names literally, in order of appearance. */
export function moduleSpecifiers(t: Tokenized): string[] {
  return moduleLoads(t).flatMap((l) => (l.specifier === null ? [] : [l.specifier]));
}
