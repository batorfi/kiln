// kiln/tests/pi/ui/keymap.test.ts — T024 (US4), r9 · data-model E7 · research D10 · FR-007 · OFFLINE tier.
// LAYERB_KEY/LAYERC_KEY/TOGGLE_KEY each match a real `modifier+key` shape — no bare letter/symbol remains. keymapIsConsistent()
// still returns true. None of the three equals any entry in a committed, dated snapshot of Pi's default-binding list.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LAYERB_KEY, LAYERC_KEY, TOGGLE_KEY, keymapIsConsistent } from "../../../ui/keymap.ts";

// A modifier+key shape per docs/keybindings.md's "Key Format": modifiers ctrl/shift/alt/super (combinable, `+`-joined), then a
// key from letters/digits/named-specials/symbols. This is the SAME check contract `ui-ready.md` U2(h) runs.
const KEY_FORMAT = /^(?:ctrl\+|alt\+|shift\+|super\+)+[a-z0-9/]+$/;

test("LAYERB_KEY/LAYERC_KEY/TOGGLE_KEY each match the Key Format regex — a real modifier+key shape, no bare letter/symbol", () => {
  for (const key of [LAYERB_KEY, LAYERC_KEY, TOGGLE_KEY]) assert.match(key, KEY_FORMAT, `"${key}" is not a valid modifier+key shortcut`);
});

test("the three values are exactly ctrl+alt+r / ctrl+alt+m / ctrl+alt+t (r and m confirmed firing in a real terminal once registered at load time; see keymap.ts's header)", () => {
  assert.equal(LAYERB_KEY, "ctrl+alt+r");
  assert.equal(LAYERC_KEY, "ctrl+alt+m");
  assert.equal(TOGGLE_KEY, "ctrl+alt+t");
});

test("keymapIsConsistent() still returns true (pairwise distinct, unchanged shape)", () => {
  assert.equal(keymapIsConsistent(), true);
});

/**
 * A committed, dated snapshot of Pi's COMPLETE documented default-binding list (baseline.md's T002 re-confirmation, 2026-09-24,
 * against the installed Pi 0.87.0's own docs/keybindings.md) — every default value across every table in that file. A future Pi
 * update changing its OWN defaults would need a visible diff here, not a silent invalidation of this test.
 */
const ALL_PI_DEFAULTS: readonly string[] = [
  // TUI Editor Cursor Movement / Deletion / Input / Kill Ring / Clipboard
  "up", "down", "left", "right", "ctrl+b", "ctrl+f", "alt+left", "ctrl+left", "alt+b", "alt+right", "ctrl+right", "alt+f",
  "home", "ctrl+home", "ctrl+a", "end", "ctrl+end", "ctrl+e", "ctrl+]", "ctrl+alt+]", "pageUp", "ctrl+pageUp", "pageDown",
  "ctrl+pageDown", "backspace", "delete", "ctrl+d", "ctrl+w", "alt+backspace", "alt+d", "alt+delete", "ctrl+u", "ctrl+k",
  "shift+enter", "ctrl+j", "enter", "tab", "ctrl+y", "alt+y", "ctrl+-", "ctrl+z", "alt+z", "ctrl+c",
  // Fullscreen Viewport
  "ctrl+shift+up", "ctrl+up", "ctrl+shift+down", "ctrl+down", "ctrl+shift+f", "ctrl+f", "ctrl+g", "shift+ctrl+g",
  // Application / Sessions
  "escape", "ctrl+v", "alt+v", "ctrl+p", "ctrl+s", "ctrl+n", "ctrl+r", "ctrl+backspace",
  // Models and Thinking / Display and Message Queue
  "ctrl+l", "shift+ctrl+p", "alt+p", "shift+tab", "ctrl+t", "ctrl+o", "ctrl+x", "alt+enter", "ctrl+q", "alt+up", "alt+q",
  // Tree Navigation / Scoped Models Selector
  "shift+l", "shift+t", "shift+ctrl+o",
];

test("none of the three chosen keys equals any entry in Pi's documented default-binding snapshot (no conflict)", () => {
  for (const key of [LAYERB_KEY, LAYERC_KEY, TOGGLE_KEY]) {
    assert.ok(!ALL_PI_DEFAULTS.includes(key), `"${key}" collides with a Pi default binding`);
  }
});

test("the three keys are pairwise distinct", () => {
  assert.equal(new Set([LAYERB_KEY, LAYERC_KEY, TOGGLE_KEY]).size, 3);
});
