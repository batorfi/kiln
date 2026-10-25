---
id: C:inline-message
status: beta
since: 0.2.0
---
# inline-message

## Purpose
A message about the current page: info, ok, wait, danger.

## Anatomy
glyph · sentence · optional action

## Variants
info · ok · wait · danger

## States
static; dismissible only when informational

## Accessibility
`role=status` for polite, `role=alert` only for blocking errors.

## Content
What happened, what it means, what to do (charter content voice).

## Behaviour
Persistent until the condition changes.

## Do and don't
Do: say what to do. Don't: bare error codes.

## Used in
everywhere
