---
name: mindstreet-type
description: Applies the Mindstreet Lato type system, weights, and Arial fallback. Use when changing fonts, typography, font-family, font-weight, headings, body text, or quotes.
---

# Mindstreet type

Read [src/lib/design/type.ts](src/lib/design/type.ts) and [src/lib/design/lato.ts](src/lib/design/lato.ts) before any type change. Lato is the only typeface. Files live in `public/fonts/Lato` and are loaded only from `lato.ts`.

## Rules

1. Set the family on `body` with `font-family: var(--font-sans)`. Children inherit it. Do not add another `font-family`.
2. Use a role weight: `--weight-light` (300), `--weight-regular` (400), `--weight-bold` (700), `--weight-black` (900).
3. Do not use 100, 500, 600, or 800. Lato has no medium or semibold, and the browser would fake them.
4. A new cut means adding that file to `lato.ts`, `weight` in `type.ts`, and `--weight-*` in [src/app/globals.css](src/app/globals.css). Thin files are on disk and are not part of the system.
5. Do not load a second webfont. The fallback is metric-adjusted Arial from `next/font`, then `sans-serif`.
6. Quotes use italic regular. `strong` inside a quote uses bold italic, which is already loaded.

## Roles

| Role | Token | Use |
|---|---|---|
| Display | `--weight-black` | Hero and the largest headline |
| Title | `--weight-regular` | Section titles. They stay regular |
| Heading | `--weight-bold` | Menu, names, emphasis headings |
| Body | `--weight-regular` | Paragraphs, buttons, UI |
| Quiet | `--weight-light` | Footer address and other light lines |
| Quote | regular + `font-style: italic` | Blockquotes |

## Fallback

`adjustFontFallback: "Arial"` in `lato.ts` builds a size-adjusted Arial inside `--font-lato`, followed by `Arial, sans-serif`. `--font-sans` is `var(--font-lato), "Lato", sans-serif`. Named `"Lato"` only helps if the visitor already has Lato installed. Do not keep Prompt or any other brand font as a fallback.
