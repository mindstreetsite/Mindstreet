---
name: mindstreet-colors
description: Applies the Mindstreet Figma palette to CSS, admin chrome, and CMS block backgrounds. Use when changing colors, admin styling, CMS themes, swatches, page-blocks, globals.css, or palette.ts.
---

# Mindstreet colors

Read [src/lib/design/palette.ts](src/lib/design/palette.ts) before any color change. It is the only source. Keep `:root` in [src/app/globals.css](src/app/globals.css) in lockstep with the same values.

## Rules

1. Use a semantic role or an allowed surface. Do not add a new hex in `admin.css` or `page-blocks.css`.
2. Block backgrounds come only from `themesFor(type)` / `swatchesFor(type, current)`.
3. Text on a surface uses that surface's `on` color by default (`headingColor` / `bodyColor` = `auto`). Editors can override with every surface in `textColorSwatches`, the same palette as background colors, plus Brun (`--brown`, Figma Accents/Brown).
4. Lys/Mörk tones (`navyLys`, `rustMork`, …) are chrome, text, and borders. They are not module swatches.
5. A color change updates both `palette.ts` and the matching CSS variables.
6. Do not add a color that is missing from the Figma Test-page palette without asking.
7. Sage uses white text. Contrast is below WCAG AA; leave it until someone asks to change it.

## Admin roles

| Role | Token | Use |
|---|---|---|
| Canvas | `--canvas` | Admin page and gate background |
| Paper | `--paper` | Cards, fields, quiet buttons |
| Rail | `--rail` | Sidebar and miniature chrome |
| Primary | `--primary` | Primary buttons, card headers, upload |
| Text | `--text` | Body copy |
| Muted | `--text-muted` | Secondary labels, URL prefix |
| Border | `--border` | Field and card outlines |
| Accent | `--accent` | Expertise headings |
| Notice | `--notice` + `--notice-text` | Draft, warning, incomplete |
| Danger | `--danger` | Delete, destructive hover |
| Positive | `--positive` | Published / live |
| On dark | `--on-dark` | Text and icons on navy/rail |

## Block backgrounds

Call `themesFor(blockType)` for the swatch list.

- **imageText:** fog (Varmgrå), ice, ink (Marinblå), blush, coral, sage
- **contact, contactUs:** white, sand, coral, sage, slate, steel, ink (Marinblå), fog (Varmgrå), mist, linen, ice, blush
- **imagePair:** sand, coral, sage, slate, steel, ink (Marinblå), fog (Varmgrå), mist, linen, ice, blush
- **text, article, sectionHeader:** white, fog, mist, linen, blush, sand
- **statement:** the light list plus ink, charcoal (Mörkgrå), rust
- **pageHeader:** every module background, plus white and the footer color (charcoal). Logo and menu switch to the light marks on dark surfaces.
- **contactForm:** no swatch. The address sits on the photo in white. The form card stays linen.
- **expertise, offering, news, newsTwelve, textColumn, hero, banner:** no background swatch. Heading and body colors still come from `textColorSwatches`. Expertise stays blush with rust heading until overridden. Hero and banner stay image plus dark shade.

Existing stored themes that fall outside the list still render via `.cms-theme-*`. `swatchesFor(type, current)` keeps the current value visible.

## Surfaces

`.cms-theme-{id}` sets `background` and `color` from the surface. White text (`--on-dark`) is for ink, steel, slate, charcoal, rust, and sage. Everything else uses `--on-light` (navy).
