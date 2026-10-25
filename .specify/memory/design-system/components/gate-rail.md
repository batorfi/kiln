---
id: C:gate-rail
status: beta
since: 0.2.0
---
# gate-rail

## Purpose
One dot per gate of a feature's flow, showing who decided or what is happening.

## Anatomy
dots in order · word under the current one · legend

## Variants
decided by a human · passed under delegation · waiting · working · skipped by triage · not applicable

## States
each gate dot has one of the six states; focus moves along the rail with arrow keys

## Accessibility
a list of items with names and states; keyboard focusable; not colour alone — shape + word on the focused and current dot.

## Content
Gate names exactly as the flow names them (Architecture, Experience design, UI review …).

## Behaviour
Read-only; opens the gate's brief or record on activation.

## Do and don't
Do: show *not applicable* gates. Don't: hide skipped gates.

## Used in
S1 · S4 · S5 · S6
