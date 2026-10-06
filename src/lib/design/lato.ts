import localFont from "next/font/local";

/**
 * Self-hosted Lato. Only these cuts are loaded.
 * Keep weights in sync with `weight` in type.ts and `--weight-*` in globals.css.
 * Files for Thin (100) stay in public/fonts/Lato but are not part of the system.
 */
export const lato = localFont({
  src: [
    {
      path: "../../../public/fonts/Lato/Lato-Light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../../public/fonts/Lato/Lato-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../../public/fonts/Lato/Lato-Italic.ttf",
      weight: "400",
      style: "italic",
    },
    {
      path: "../../../public/fonts/Lato/Lato-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../../public/fonts/Lato/Lato-BoldItalic.ttf",
      weight: "700",
      style: "italic",
    },
    {
      path: "../../../public/fonts/Lato/Lato-Black.ttf",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-lato",
  display: "swap",
  adjustFontFallback: "Arial",
  fallback: ["Arial", "sans-serif"],
});
