---
id: C:status-pill
status: beta
since: 0.2.0
---
# status-pill

## Purpose
State of a thing in words and a shape: waiting, passed, delegated, working, rejected, kept.

## Anatomy
shape glyph · word · container (`status.*.bg`, `.fg`)

## Variants
wait · ok · delegated · info · danger · neutral

## States
one state per pill; no hover state (not interactive)

## Accessibility
text contrast ≥ 4.5:1 in every mode; the word is real text; the glyph is `aria-hidden`.

## Content
Short and plain: *Waiting for you*, *Passed*, *Delegated*, *Working*, *Rejected*.

## Behaviour
Static; updated by events, announced politely by the live region of the owning card.

## Do and don't
Do: always include the word. Don't: colour-only dots (the rail's dots add a word nearby).

## Used in
gate rail · gate card · Needs you item · feed item · factory card
