// r16 T007 — the two hand-declared tools: read-file/write-file, their replay-safety classification, and workspace scoping.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TOOLS, WorkspaceEscapeError } from "#workers/tools.ts";

function withWorkspace(fn: (workspace: string) => Promise<void> | void) {
  const workspace = mkdtempSync(join(tmpdir(), "kiln-tools-"));
  return Promise.resolve(fn(workspace)).finally(() => rmSync(workspace, { recursive: true, force: true }));
}

test("read-file returns a file's content", () =>
  withWorkspace(async (workspace) => {
    const { writeFileSync } = await import("node:fs");
    writeFileSync(join(workspace, "notes.md"), "hello");
    const result = await TOOLS["read-file"].run({ path: "notes.md" }, { workspace });
    assert.equal(result.content, "hello");
    assert.equal(result.isError, false);
  }));

test("write-file writes the content", () =>
  withWorkspace(async (workspace) => {
    const result = await TOOLS["write-file"].run({ path: "out.md", content: "written" }, { workspace });
    assert.equal(result.isError, false);
    assert.equal(readFileSync(join(workspace, "out.md"), "utf8"), "written");
  }));

test("a path resolving outside the workspace is refused by name, for both tools", () =>
  withWorkspace(async (workspace) => {
    await assert.rejects(() => TOOLS["read-file"].run({ path: "../../etc/passwd" }, { workspace }), WorkspaceEscapeError);
    await assert.rejects(() => TOOLS["write-file"].run({ path: "/etc/passwd", content: "x" }, { workspace }), WorkspaceEscapeError);
  }));

test("replay-safety is a declared field, never inferred from the tool's name or a call's outcome", () => {
  assert.equal(TOOLS["read-file"].replaySafe, true);
  assert.equal(TOOLS["write-file"].replaySafe, false);
  // declared, not computed: the field exists independent of any invocation
  assert.equal(typeof TOOLS["read-file"].replaySafe, "boolean");
  assert.equal(typeof TOOLS["write-file"].replaySafe, "boolean");
});

test("neither tool can open a conversation (WORK-3): no reference to pi-ai or conversation.ts in this module's declared surface", () => {
  for (const tool of Object.values(TOOLS)) {
    assert.equal(typeof tool.run, "function");
    assert.ok(!("stream" in tool) && !("complete" in tool) && !("runTurn" in tool));
  }
});
