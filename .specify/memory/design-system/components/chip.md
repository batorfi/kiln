---
id: C:chip
status: beta
since: 0.2.0
---
# chip

## Purpose
A small fact or filter: locality, factory, ticket, tag.

## Anatomy
text · optional dot/glyph

## Variants
fact (static) · filter (toggle)

## States
filter: default · hover · focus · pressed

## Accessibility
fact chips are text; filter chips are toggle buttons with `aria-pressed`.

## Content
Nouns, lower case unless a name.

## Behaviour
Filters apply immediately and are recorded as a view setting only.

## Do and don't
Do: a word with every dot. Don't: more than five chips in a row.

## Used in
page headers · feed · brief
