# KILN logo

![KILN logo on light, dark, as icons and at small sizes](kiln-logo-preview.png)

**The idea — nested gates.** Three arches, narrowing to one: the gates a feature passes through, one inside the next, until
the work reaches the last chamber — and in it, one dot: the person who decides. It is KILN's thesis in a shape: *many
gates, one decision held by a person*. It is built from the interface's own teal, in three tints that deepen inward, so
the logo and the product are one system (`docs/concepts/design-system.md` §12.1). It replaces the earlier ember arch
(kept in [`archive/`](archive/v1-ember-arch/)).

| File | Use |
|---|---|
| [`kiln-mark.svg`](kiln-mark.svg) | the mark alone, on light surfaces — app chrome, 32 px and up |
| [`kiln-mark-dark.svg`](kiln-mark-dark.svg) | the mark alone, on dark surfaces (the navigation rail, headers) |
| [`kiln-mark-small.svg`](kiln-mark-small.svg) | the **small-size mark**, 16–24 px: two arches, heavier strokes, solid colour |
| [`kiln-logo.svg`](kiln-logo.svg) | mark and wordmark, for light backgrounds |
| [`kiln-logo-dark.svg`](kiln-logo-dark.svg) | mark and wordmark, for dark backgrounds |
| [`kiln-icon.svg`](kiln-icon.svg) · [`kiln-icon-dark.svg`](kiln-icon-dark.svg) | app icon and favicon: teal square with a white mark · deep-teal square with a light-teal mark |

**Colours (design-system tokens).** Mark on light: `#A9D3CC` · `#5FAEA4` · `#0F766E` (outer to inner; the inner is `color.action.primary`); on dark: `#2B5C57` · `#1E8F84` · `#2DD4BF` (the inner is `color.action.on-rail`); wordmark `#14201F` on light, `#E9EFEC` on dark; icon surfaces `#0F766E` and `#10201F`. Flat colour
only — no gradients, no glow.

**Wordmark.** `KILN` in **Charter Bold**, letter-spaced, vertically centred on the mark — the same face as the interface's
page headings (`font.family.display`). The SVGs carry **outlined paths**, so no font is needed to display them.

**Keep it simple.** Don't add a flame, a border, a shadow or a tagline to the mark; don't recolour it outside the two
pairs above; leave clear space around the mark of at least the width of the inner arch (¼ of the mark's width). Below 24 px
use the small-size mark. Never reduce the wordmark below 14 px cap height.

**Exploration.** Three concepts were drawn — *Fork*, *Nested gates* and *Cell* — and **Nested gates** chosen (the Fork K, a K whose arms meet at a decision node, is the runner-up):
[`exploration/kiln-mark-options.png`](exploration/kiln-mark-options.png).

## GitHub images

| File | Size | Use |
|---|---|---|
| `kiln-social-preview.png` | 1280 × 640 | the repository's **social preview** (Settings → General → Social preview) |
| `kiln-avatar.png` | 512 × 512 | a square **avatar** — the dark icon, for a profile or organisation picture |

GitHub's API cannot set either image; both are uploaded by hand in GitHub's settings.
