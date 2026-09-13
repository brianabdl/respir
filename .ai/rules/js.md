---
paths:
    - resources/js/app.tsx
---

# Js

## Consult page uses dedicated full-viewport ConsultLayout

The patient consult page maps to a dedicated full-viewport layout (`consult` -> ConsultLayout in the app.tsx layout switch). The page is always-dark Saga (explicit hex, no theme tokens) with camera filling the screen and chat/cough controls in a slide-in panel. Never wrap it in the app sidebar/header layout.
