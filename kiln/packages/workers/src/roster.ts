// `packages/workers/src/roster.ts` — the PROVISIONAL role roster (r16 T006/T008, research R7, data-model.md §1).
//
// PROVISIONAL: this module is the whole of r16's role configuration. r17 ("Configuration as files") replaces it wholesale
// with `kiln.config/` and `agents/*.md` — nothing here is meant to grow between now and then. Two roles are the minimum
// the spec's own user stories need: one producer, one judge (spec Assumptions).
import { bindRole, isJudge, TierPolicyError, type Tier } from "#contracts/roles.ts";
import type { RoleRoster } from "#contracts/flow/types.ts";
import { TOOLS, type ToolName } from "./tools.ts";

export interface RoleEntry {
  tier: Tier;
  /** Names declared in `tools.ts`; an undeclared name is a configuration error (T008), never discovered mid-generation. */
  tools: readonly ToolName[];
  judge: boolean;
  /** R6/FR-006: the per-tier generation timeout. A step that exceeds it fails by name; it never settles a gate (FR-008). */
  timeoutMs: number;
  /** r16 T018: the conversation's system prompt — short and functional by design (this roster is provisional; r17's agents/*.md own real prompt authoring). */
  systemPrompt: string;
}

export type ProvisionalRoster = Readonly<Record<string, RoleEntry>>;

/** Fed to `isJudge`/`bindRole` (unchanged) as this row's extra-judges list, so a `reviewer` step is bound exactly as a built-in judge is. */
export const PROVISIONAL_JUDGES = ["reviewer"] as const;

export const PROVISIONAL_ROSTER: ProvisionalRoster = Object.freeze({
  worker: Object.freeze({
    tier: "standard",
    tools: ["read-file", "write-file"],
    judge: false,
    timeoutMs: 120_000,
    systemPrompt: "You are a KILN worker. Use your tools to complete the step you are given. When you are done, say so in plain text.",
  }),
  reviewer: Object.freeze({
    tier: "strongest",
    tools: ["read-file"],
    judge: true,
    timeoutMs: 180_000,
    systemPrompt: "You are a KILN judge. Read what you are given with your tools and give a short, honest verdict in plain text. You never write or execute anything.",
  }),
});

/** True exactly for `PROVISIONAL_ROSTER`'s own judge entries — kept distinct from the flow's built-in judges, which this roster never touches. */
export function isProvisionalJudge(role: string): boolean {
  return PROVISIONAL_ROSTER[role]?.judge === true;
}

export class UnknownRoleError extends Error {
  override name = "UnknownRoleError";
}

export class UnknownToolError extends Error {
  override name = "UnknownToolError";
}

function entryFor(role: string): RoleEntry {
  const entry = PROVISIONAL_ROSTER[role];
  if (!entry) throw new UnknownRoleError(`"${role}" is not in the provisional roster (${Object.keys(PROVISIONAL_ROSTER).join(", ")})`);
  return entry;
}

/**
 * Resolves tool names against `tools.ts`'s declared set. Throws, naming the first unknown one, before any `pi-ai` call
 * exists — never discovered mid-generation. The guard `toolsFor` and `UnknownToolError`'s tests both exercise for real.
 */
export function resolveTools(toolNames: readonly string[], role?: string): (typeof TOOLS)[ToolName][] {
  return toolNames.map((name) => {
    const tool = TOOLS[name as ToolName];
    if (!tool) throw new UnknownToolError(`${role ? `role "${role}" names` : "names"} tool "${name}", which tools.ts does not declare`);
    return tool;
  });
}

/** A role's declared tools, resolved against `tools.ts`'s declared set (T007/T008). */
export function toolsFor(role: string): (typeof TOOLS)[ToolName][] {
  return resolveTools(entryFor(role).tools, role);
}

/**
 * Binds a role to its roster tier, re-throwing `contracts/src/roles.ts`'s own `TierPolicyError` unchanged when a judge's
 * roster tier is not `strongest` (constitution II) — checked here, before any `pi-ai` call exists.
 */
export function bindConversationRole(role: string, roster: RoleRoster): { tier: Tier; timeoutMs: number; systemPrompt: string } {
  const entry = entryFor(role);
  const tier = bindRole(role, entry.tier, roster, PROVISIONAL_JUDGES);
  return { tier, timeoutMs: entry.timeoutMs, systemPrompt: entry.systemPrompt };
}

export { isJudge, TierPolicyError };
