import { Amiri, Cormorant_Garamond, Great_Vibes, Inter } from "next/font/google";

/**
 * The typographic palette for NIKKAHFY, in one place.
 *
 * `--font-sans` backs the dashboard and admin UI, so it is bound to Tailwind's
 * `font-sans` token (see the `@theme inline` block in `src/app/globals.css`).
 * The decorative families are exposed as standalone variables and consumed by
 * the invitation templates through Tailwind's `font-script` / `font-serif` /
 * `font-arabic` utilities.
 */

export const fontSans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const fontScript = Great_Vibes({
  variable: "--font-script",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const fontSerif = Cormorant_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

export const fontArabic = Amiri({
  variable: "--font-arabic",
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const fontVariables = [
  fontSans.variable,
  fontScript.variable,
  fontSerif.variable,
  fontArabic.variable,
].join(" ");
