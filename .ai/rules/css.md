---
paths:
    - 'resources/css/**'
---

# Css

## DESIGN.md is the source of truth; app.css holds the legacy token layer

Product design intent lives in root `DESIGN.md`: dark monochrome identity — black bg, white type, #94A3B8 accent, #71717A mono labels, single 14px radius, pill for badges only, Inter (--font-sans) + JetBrains Mono (--font-mono), aura motion via animate-aura-* keyframes, masked reveals + stagger + hover lift.

`resources/css/app.css` still holds the legacy ecosystem tokens (light default + dark: primary #E48B59 / accent #ED7B46 / surface #53617A / text #111827 / border #D8DADF, radius card 16 + control 8) that the un-restyled pages use. Do not treat the legacy palette as the design; it is pending migration to DESIGN.md. Do not switch color mode per surface.

## Landing (welcome.tsx) implements DESIGN.md directly

welcome.tsx uses explicit hexes/classes matching DESIGN.md — black bg, white type, #94A3B8/#71717A mono labels, 14px radius — so it stays dark even in light theme. Do not revert it to the legacy light palette.
