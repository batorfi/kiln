---
id: C:button
status: beta
since: 0.2.0
---
# button

## Purpose
The one control for acting. Use for a move, a confirm or a step-in action; use a link for navigation.

## Anatomy
label (verb first) · optional leading icon · container (`button.*` tokens)

## Variants
primary (`button.primary`: one per view) · secondary · danger (rejects and aborts; names the consequence) · quiet

## States
default · hover · focus (2 px ring, `focus.ring`) · active · disabled (says why on hover/focus) · loading (label stays, spinner replaces icon)

## Accessibility
native `<button>`; visible focus; target ≥ 36 px high and 44 px reachable; disabled buttons stay focusable when a reason is shown.

## Content
Verb first, no punctuation: *Open gate brief*, *Feed it*, *Confirm*. Never *Yes/No/OK*.

## Behaviour
Single click; repeat clicks while loading are ignored. A move button is never the default focus of a gate brief.

## Do and don't
Do: one primary per view. Don't: pre-focus or highlight a gate move.

## Used in
S1 (Feed KILN) · S6 move bar · S7 moves · feed composer
