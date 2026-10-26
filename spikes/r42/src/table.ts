// T026 — render the evidence for people: the terminal table of quickstart §2, and the Markdown table the report embeds VERBATIM (the report checker parses
// it back, so the cell contents are fixed words: held · not-held · not-proven). A caveat is marked † on the strategy and spelled out beneath the table.
import { GUARANTEES, type Evidence, type StrategyEvidence } from "./evidence-model.ts";

const label = (s: StrategyEvidence): string => `${s.name}${s.caveats.length ? " †" : ""}${s.testOnly ? " (control)" : ""}`;
const killCell = (s: StrategyEvidence): string => `${s.exercised} of ${s.killPoints.length}`;
const randomCell = (s: StrategyEvidence): string => (s.randomKills ? `${s.randomKills} random` : "—");
const header = (e: Evidence): string => `${e.piDurable.name} ${e.piDurable.version} · node ${e.node} · ${e.platform} · ${e.startedAt} → ${e.finishedAt}`;

function footnotes(e: Evidence): string[] {
  const out: string[] = [];
  for (const s of Object.values(e.strategies)) for (const c of s.caveats) out.push(`† ${s.name}: ${c.text} (${c.enforceable ? "enforceable by the seam" : "NOT enforceable structurally"})`);
  for (const s of Object.values(e.strategies)) for (const n of s.notes) out.push(`note ${s.name}: ${n}`);
  return out;
}

export function renderTable(e: Evidence): string {
  const rows = Object.values(e.strategies);
  const w = Math.max(8, ...rows.map((s) => label(s).length));
  const cols = [...GUARANTEES.map((g) => g)];
  const lines = [header(e), "", `${"strategy".padEnd(w)}  ${cols.map((c) => c.padEnd(10)).join(" ")}  kill points`];
  for (const s of rows) {
    lines.push(`${label(s).padEnd(w)}  ${GUARANTEES.map((g) => s.guarantees[g].status.padEnd(10)).join(" ")}  ${killCell(s)}${s.randomKills ? ` + ${s.randomKills} random` : ""}`);
  }
  const f = footnotes(e);
  return [...lines, ...(f.length ? ["", ...f] : [])].join("\n");
}

export function renderMarkdown(e: Evidence): string {
  const rows = Object.values(e.strategies);
  const lines = [
    `*${header(e)}*`,
    "",
    `| Strategy | ${GUARANTEES.join(" | ")} | Kill points | Random kills |`,
    `|---|${GUARANTEES.map(() => "---").join("|")}|---|---|`,
    ...rows.map((s) => `| ${label(s)} | ${GUARANTEES.map((g) => s.guarantees[g].status).join(" | ")} | ${killCell(s)} | ${randomCell(s)} |`),
  ];
  const f = footnotes(e);
  return [...lines, ...(f.length ? ["", ...f.map((x) => `- ${x}`)] : [])].join("\n");
}
