---
id: F:color
status: beta
---
# Color

Colour has three jobs: **surface** (sand page, white raised, deep-teal rail), **action** (one teal accent), and **state** (five status roles).

- Teal is the only accent. It marks what you can act on and where you are (the active rail item, the primary button, links, focus).
- **Waiting is amber.** Nothing else uses amber, so a person can find what waits on them at a glance, and it is never red — waiting is not an emergency (charter X7).
- Delegated is violet, working is blue, passed is green, rejected is red. Each is always paired with a word and a shape (`●` waiting, `✓` passed, `◆` delegated, `ⓘ` working, `✕` rejected).
- The logo uses the same two teals (`action.primary` on light, `action.on-rail` on dark); there is no separate brand colour. The earlier ember is retired.
- Contrast: every text pair meets 4.5:1 and every meaningful boundary 3:1, **in every mode** (`tokens/contrast.json`). The decorative border `border.default` never carries meaning alone.
- Dark mode keeps the same roles: the accent becomes the light teal, tints become deep tints of the same hue.
