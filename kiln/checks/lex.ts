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

// `import x from "s"`, `export * from "s"`, `import "s"`, `require("s")`, `import("s")` — matched on the MASKED text (shape only), specifier read from `code`.
const MODULE_REFERENCE = /(?:^|\s)(?:import|export)\s+[^;'"]*?\s+from\s*["']([^"']+)["']|(?:^|[\s;])import\s*["']([^"']+)["']|\brequire\(\s*["']([^"']+)["']\s*\)|\bimport\(\s*["']([^"']+)["']\s*\)/dg;

/** Every module specifier the code names, in order of appearance — never one that only appears inside a comment, a string or a template. */
export function moduleSpecifiers(t: Tokenized): string[] {
  const out: string[] = [];
  for (const m of t.masked.matchAll(MODULE_REFERENCE)) {
    const span = (m as RegExpMatchArray & { indices: ([number, number] | undefined)[] }).indices.slice(1).find((x) => x !== undefined);
    if (span) out.push(t.code.slice(span[0], span[1]));
  }
  return out;
}
