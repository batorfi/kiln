---
id: C:nav-rail
status: beta
since: 0.2.0
---
# nav-rail

## Purpose
The frame: place, navigation (Needs you first), factories with state, host strip.

## Anatomy
brand · workshop · nav items with counts · factories with state word and shape · host strip

## Variants
expanded · top-bar at compact

## States
focus visible on dark surface (`action.on-rail`); the current item has an indicator bar plus bold

## Accessibility
`<nav>` landmark; current item `aria-current`; counts have text alternatives.

## Content
Same words as the charter: Needs you, Factories, Knowledge …

## Behaviour
Never changes between screens.

## Do and don't
Do: keep Needs you first. Don't: reorder by activity.

## Used in
every screen (S0)
