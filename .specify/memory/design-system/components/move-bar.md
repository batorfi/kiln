---
id: C:move-bar
status: beta
since: 0.2.0
---
# move-bar

## Purpose
The set of moves a gate offers, with what each does, in the brief.

## Anatomy
move buttons · consequence text per move · note field · *as* name

## Variants
approve · revise · reject · restart · split + revise (per gate)

## States
no move selected on arrival; the note field is required when sending back; disabled moves say why

## Accessibility
buttons grouped in a labelled region; consequence text associated by `aria-describedby`; confirmation names how far back and what is redone.

## Content
Plain verbs; consequence in one sentence each.

## Behaviour
Applies to exactly the brief as seen; recorded under the person's name.

## Do and don't
Do: no pre-selection, ever. Don't: add a default or a timeout.

## Used in
S6 · S7
