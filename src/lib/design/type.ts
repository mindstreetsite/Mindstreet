/**
 * Lato roles. The family is set once on `body` via `--font-sans`.
 * Keep `weight` in sync with lato.ts and `--weight-*` in globals.css.
 */
export const weight = {
  light: 300,
  regular: 400,
  bold: 700,
  black: 900,
} as const;

export const role = {
  /** Hero and the largest headline. */
  display: { weight: weight.black, style: "normal" },
  /** Section titles. Public titles stay regular. */
  title: { weight: weight.regular, style: "normal" },
  /** Menu, names, and other emphasis headings. */
  heading: { weight: weight.bold, style: "normal" },
  /** Paragraphs, buttons, and UI text. */
  body: { weight: weight.regular, style: "normal" },
  /** Footer address and other light secondary lines. */
  quiet: { weight: weight.light, style: "normal" },
  /** Quotes. `strong` inside a quote uses bold italic. */
  quote: { weight: weight.regular, style: "italic" },
} as const;
