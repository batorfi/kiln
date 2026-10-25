---
name: KILN design system
version: 0.2.0
owner: human@batorfi            # the named design owner (also the experience owner for now)
charter: 0.1.0                  # the experience charter version this was made against
modes: [light, dark]            # every semantic token has a value in each
breakpoints: { compact: 0, regular: 720, wide: 1200 }
implementation:
  tokens_build: <to be set when the web front door is built — a build step turns tokens/*.json into CSS variables>
  components: <to be set — the front door's component library path>
  external: ~
status: draft                   # draft · approved — the theme direction was approved by human@batorfi on 2026-10-25; the manifest awaits formal approval at the Roadmap gate (DSN-12)
---
# KILN design system

The design system for KILN's own surfaces: the web front door, and the terminal and editor surfaces where they share
tokens, words and states. Concept: `docs/concepts/design-system.md` (§12, §12.1 the teal-and-sand theme). It is made
against the experience charter (`.specify/memory/experience-charter.md`) and pinned by it.

**Three rules specific to KILN.** (1) Colour never carries a state alone — every state has a word and a shape. (2) No
control pre-selects a gate move. (3) The ember is the brand mark's colour only; it is not a UI colour.

## Inventory
| Id | Kind | Status | Since |
|---|---|---|---|
| C:button | component | beta | 0.2.0 |
| C:status-pill | component | beta | 0.2.0 |
| C:gate-rail | component | beta | 0.2.0 |
| C:gate-card | component | beta | 0.2.0 |
| C:move-bar | component | beta | 0.2.0 |
| C:needs-you-item | component | beta | 0.2.0 |
| C:feed-item | component | beta | 0.2.0 |
| C:nav-rail | component | beta | 0.2.0 |
| C:card | component | beta | 0.2.0 |
| C:chip | component | beta | 0.2.0 |
| C:inline-message | component | beta | 0.2.0 |
| C:empty-state | component | beta | 0.2.0 |
| P:decide-at-a-gate | pattern | beta | 0.2.0 |
| P:come-back-after-away | pattern | beta | 0.2.0 |
| P:proposal-not-decision | pattern | beta | 0.2.0 |
| P:step-in | pattern | beta | 0.2.0 |
| P:confirm-with-consequence | pattern | beta | 0.2.0 |
| F:color · F:typography · F:spacing-and-layout · F:elevation · F:motion · F:iconography · F:imagery | foundation | beta | 0.2.0 |

## Notes
- Out of scope for 0.2.0: data tables, the diff view, charts and the knowledge reader (specified when their screens are built).
- Open: icon set choice; whether Charter ships as a bundled web font or stays a system font (licence and weight check).
- `kiln check design-system` verifies: manifest complete, tokens resolve, every semantic token has a value in every mode, the contrast registry passes per mode, every component states every state.
