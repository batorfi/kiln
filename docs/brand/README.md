# KILN logo

![KILN logo on light, dark, as icons and at small sizes](kiln-logo-preview.png)

**The idea — the Fork K.** A **K** made of one stem and two arms that meet at a **node**. It is the shape of the one thing
KILN is for: the work runs along a flow, and at the gate a person sits at the node and chooses where it goes — *approve*,
*revise*, *reject*. The node is held clear of the arms by a small gap, because nothing decides it for the person. It is
built from the same teal as the interface, so the logo and the product are one system (`docs/concepts/design-system.md`
§12.1). It replaces the earlier ember arch (kept in [`archive/`](archive/v1-ember-arch/)).

| File | Use |
|---|---|
| [`kiln-mark.svg`](kiln-mark.svg) | the mark alone, on light surfaces — app chrome, 32 px and up |
| [`kiln-mark-dark.svg`](kiln-mark-dark.svg) | the mark alone, on dark surfaces (the navigation rail, headers) |
| [`kiln-mark-small.svg`](kiln-mark-small.svg) | the **small-size mark**, 16–24 px: heavier strokes, no gap around the node |
| [`kiln-logo.svg`](kiln-logo.svg) | mark and wordmark, for light backgrounds |
| [`kiln-logo-dark.svg`](kiln-logo-dark.svg) | mark and wordmark, for dark backgrounds |
| [`kiln-icon.svg`](kiln-icon.svg) · [`kiln-icon-dark.svg`](kiln-icon-dark.svg) | app icon and favicon: teal square with a white mark · deep-teal square with a light-teal mark |

**Colours (design-system tokens).** Mark on light `#0F766E` (`color.action.primary`); on dark `#2DD4BF`
(`color.action.on-rail`); wordmark `#14201F` on light, `#E9EFEC` on dark; icon surfaces `#0F766E` and `#10201F`. Flat colour
only — no gradients, no glow.

**Wordmark.** `KILN` in **Charter Bold**, letter-spaced, vertically centred on the mark — the same face as the interface's
page headings (`font.family.display`). The SVGs carry **outlined paths**, so no font is needed to display them.

**Keep it simple.** Don't add a flame, a border, a shadow or a tagline to the mark; don't recolour it outside the two
pairs above; leave clear space around the mark of at least the width of the node's gap (¼ of the stem height). Below 24 px
use the small-size mark. Never reduce the wordmark below 14 px cap height.

**Exploration.** Three concepts were drawn — *Fork*, *Nested gates* and *Cell* — and the Fork K chosen:
[`exploration/kiln-mark-options.png`](exploration/kiln-mark-options.png).

## GitHub images

| File | Size | Use |
|---|---|---|
| `kiln-social-preview.png` | 1280 × 640 | the repository's **social preview** (Settings → General → Social preview) |
| `kiln-avatar.png` | 512 × 512 | a square **avatar** — the dark icon, for a profile or organisation picture |

GitHub's API cannot set either image; both are uploaded by hand in GitHub's settings.
