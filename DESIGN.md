---
version: alpha
name: Respir
description: Design language for Respir, an agentic pre-visit AI for primary care. A calm, monochrome professional presentation — pure black canvas, white type, slate accent, JetBrains Mono metadata labels, one 14px radius — built around a browser-framed product mockup and powered by aura motion tokens.
colors:
    background: '#000000'
    foreground: '#FFFFFF'
    primary: '#FFFFFF'
    primary-foreground: '#000000'
    surface: '#0B0B0D'
    surface-foreground: '#FFFFFF'
    card: '#0B0B0D'
    card-foreground: '#FFFFFF'
    accent: '#94A3B8'
    muted: '#A1A1AA'
    muted-foreground: '#71717A'
    border: 'rgba(255,255,255,0.10)'
    contrast: '#F4F4F5'
    contrast-foreground: '#000000'
typography:
    display-lg:
        fontFamily: Inter
        fontSize: 64px
        lineHeight: 1.04
        fontWeight: 500
    body-md:
        fontFamily: Inter
        fontSize: 16px
        lineHeight: 1.6
        fontWeight: 400
    label-md:
        fontFamily: JetBrains Mono
        fontSize: 12px
        lineHeight: 1.2
        fontWeight: 600
rounded:
    base: 14px
    card: 14px
    control: 14px
    pill: 9999px
spacing:
    base: 8px
    gap: 16px
    card-padding: 24px
    section-padding: 80px
components:
    button:
        backgroundColor: '{colors.primary}'
        textColor: '{colors.primary-foreground}'
        rounded: '{rounded.base}'
    card:
        backgroundColor: '{colors.card}'
        rounded: '{rounded.card}'
        padding: '{spacing.card-padding}'
---

# Respir

## Overview

This document defines Respir's design language. Respir is a primary-care AI product that guides a patient through a private pre-visit — a voice interview followed by a cough-based TB screen — and hands the clinician a structured briefing.

The style is a professional, calm SaaS presentation built for a clinical audience: a pure black canvas, white type, and restrained slate accents organized into information-dense, modular panels. Inter renders headings and body copy; JetBrains Mono renders labels, metrics, and technical metadata. Everything sits on one 14px radius, one hairline border language, and one motion system based on masked reveals.

The first screen is the design's anchor: a centered headline with a single focal object — the product mockup framed in browser chrome — as the hero. Sections alternate washes against the black page to keep rhythm while scrolling, and repeated items stagger on reveal. The finished product's in-app theme is still light; it is the subject of a pending restyle to this same language.

## Colors

`background` is pure black and `foreground` is white; nothing else competes on the canvas. `primary` is white — the color of the primary action button — with black `primary-foreground`. `surface` and `card` (`#0B0B0D`) lift panels off the black backdrop with hairline `border` (`rgba(255,255,255,0.10)`) rather than fill. `accent` is the restrained slate `#94A3B8` for emphasis spans, icon fills, gauge progress, and chip icons. Body copy reads as `muted` (`#A1A1AA`); mono metadata, footer labels, and section tags read as `muted-foreground` (`#71717A`). `contrast` (`#F4F4F5`) is the inverted CTA panel with black `contrast-foreground` text.

The surface is monochrome by intent: consent, status, and risk indicators use white, slate, or alpha value, never saturated signal colors.

## Themes

The spec in use cannot encode modes, so alternate themes are documented here. The rows above are the default (landing) values.

| Token        | Console light (legacy, not yet restyled) | Console dark (legacy) |
| ------------ | ---------------------------------------- | --------------------- |
| `background` | `#FFFFFF`                                | `#0C0D10`             |
| `foreground` | `#111827`                                | `#F4F4F5`             |
| `surface`    | `#53617A`                                | `#23262E`             |
| `card`       | `#FFFFFF`                                | `#121417`             |
| `border`     | `#D8DADF`                                | `#2B2F38`             |
| `accent`     | `#ED7B46`                                | `#ED7B46`             |
| body text    | `#4B5563`                                | `#9CA3AF`             |
| card radius  | 16px                                     | 16px                  |

The landing stays dark even when an app-level light theme is active because it sets explicit hex values rather than theme tokens.

## Typography

Inter is the only sans face for display and body; JetBrains Mono is the only mono face. Headings use the `display-lg` scale — 500 weight, tight 1.04 line height — with slight negative letter spacing on the landing. Body copy uses `body-md` with a 1.6 line height. Labels use `label-md` set in JetBrains Mono, scaled down to 10–11px and rendered uppercase for badges, eyebrows, step tags, metrics, and session metadata. User-facing paragraphs never use mono.

## Layout

Spacing follows an 8px base with 16px standard gaps, 24px card padding, and roughly 80px section padding. Content sits in a centered `max-w-6xl` column. The hero is center-aligned and holds exactly one focal object — the product mockup — with no competing focal elements. Sections keep a steady rhythm and density: the feature bento, the five-step process, and the FAQ accordion all use the same card density and responsive stacking behavior. Section headings are introduced by a pill eyebrow followed by a 500-weight display heading.

## Elevation & Depth

Interactive cards sit on hairline borders with a soft resting shadow and lift on hover — `-translate-y-1` with an enlarged, softened shadow — while static panels stay flat. The product mockup is framed in browser chrome and casts a deep drop shadow; the CTA panel is an inverted near-white slab with a matching deep shadow.

Motion is smooth and restrained, with consistent easing. Entrance uses a masked reveal — content fades in while rising roughly 18px — with staggered delays for repeated items. Live indicators pulse on an infinite cycle at low opacity. Any ambient rendering (radial glows, atmospheric washes) sits behind the content as a supporting layer, never in front, and stays secondary to the interface.

## Shapes

Every ordinary surface and control uses the 14px `base` radius — cards, buttons, inputs, the browser mockup, and the CTA slab all share it. Only the `pill` radius (`9999px`) applies elsewhere, for badges, eyebrows, and status chips. Buttons, cards, and badges all align to the same radius and border language; no other radius level is mixed into the surface.

## Components

- **Button** — the primary action is white (`{colors.primary}` background, `{colors.primary-foreground}` text) with a hover toward `#CBD5E1`; secondary actions are transparent with a `{colors.border}` outline. All buttons use `{rounded.base}` (14px).
- **Card** — `{colors.card}` background, hairline `{colors.border}`, `{rounded.card}` (14px), `card-padding` inset. Cards are the unit for the feature bento grid, metric tiles, step cards, FAQ accordion, and the mockup's inner panels.
- **Eyebrow/Badge** — `pill` radius with `label-md` mono text; prefixes section headings and doubles as status chips.
- **Product mockup** — browser chrome drawn as an elevated bar (traffic-light dots, mono URL pill) over `{colors.surface}` panels; voice transcript, risk gauge, and briefing cards render inside at 10–11px.

## Do's and Don'ts

- **Don't** switch color mode per surface: the landing stays dark regardless of the app-level theme.
- **Don't** revert the landing to a light palette; its explicit hex values are the design, not a temporary state.
- **Don't** introduce saturated signal colors into the monochrome surface.
- **Don't** flatten the signature bento and dashboard panel structures into a generic card grid.
- **Don't** dilute the first screen with competing focal objects; the product mockup is the hero focus.
- **Don't** mix radius levels; the 14px base and the pill are the only two allowed shapes.
- **Do** keep user-facing prose in Inter and reserve JetBrains Mono for labels, metrics, and metadata.
- **Do** keep effects performant and secondary to the interface content.
