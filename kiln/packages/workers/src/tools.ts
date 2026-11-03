// `packages/workers/src/tools.ts` — the two hand-declared tools of r16's proof (T007, data-model.md §2, FR-010, FR-046).
// Minimal by decision (spec Clarification): enough to exercise both branches of replay discipline (FR-010–FR-013) for
// real, without r17's full tool-configuration system. No shell/command tool and no subagent tool exist for any role in
// this row (WORK-3): neither tool here can open a conversation.
import { readFile, writeFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";

export type ToolName = "read-file" | "write-file";

export interface ToolResult {
  content: string;
  isError: boolean;
}

export interface ToolDecl {
  name: ToolName;
  /** Declared once, read from this field — never inferred from the tool's name or from what a given call happened to do (FR-010). */
  replaySafe: boolean;
  /** JSON Schema for the tool's arguments, passed to `pi-ai`'s `Tool` declaration (T018). */
  schema: Record<string, unknown>;
  run(args: { path: string; content?: string }, ctx: { workspace: string }): Promise<ToolResult>;
}

export class WorkspaceEscapeError extends Error {
  override name = "WorkspaceEscapeError";
}

/** A path outside `workspace` is refused by name for both tools — never silently followed. */
function resolveInWorkspace(workspace: string, path: string): string {
  const abs = isAbsolute(path) ? path : resolve(workspace, path);
  const root = resolve(workspace);
  if (abs !== root && !abs.startsWith(root + "/")) {
    throw new WorkspaceEscapeError(`"${path}" resolves outside the workspace (${workspace})`);
  }
  return abs;
}

const readFileTool: ToolDecl = {
  name: "read-file",
  replaySafe: true,
  schema: { type: "object", properties: { path: { type: "string" } }, required: ["path"], additionalProperties: false },
  async run(args, ctx) {
    const abs = resolveInWorkspace(ctx.workspace, args.path);
    try {
      return { content: await readFile(abs, "utf8"), isError: false };
    } catch (e) {
      return { content: `read-file failed: ${(e as Error).message}`, isError: true };
    }
  },
};

const writeFileTool: ToolDecl = {
  name: "write-file",
  replaySafe: false,
  schema: {
    type: "object",
    properties: { path: { type: "string" }, content: { type: "string" } },
    required: ["path", "content"],
    additionalProperties: false,
  },
  async run(args, ctx) {
    const abs = resolveInWorkspace(ctx.workspace, args.path);
    try {
      await writeFile(abs, args.content ?? "", "utf8");
      return { content: `wrote ${abs}`, isError: false };
    } catch (e) {
      return { content: `write-file failed: ${(e as Error).message}`, isError: true };
    }
  },
};

export const TOOLS: Readonly<Record<ToolName, ToolDecl>> = Object.freeze({
  "read-file": readFileTool,
  "write-file": writeFileTool,
});
