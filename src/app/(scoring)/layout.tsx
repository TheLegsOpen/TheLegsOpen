import type { Metadata, Viewport } from "next";
import { Playfair_Display, Source_Sans_3, Newsreader, Manrope } from "next/font/google";
import localFont from "next/font/local";

import { getSiteTheme, type FontPreset } from "@/lib/data/site-theme";
import { hexToHslTriplet } from "@/lib/utils";

import "../(app)/globals.css";

// Same font set as the main site's (app)/layout.tsx, duplicated rather than shared -- next/font's
// loader calls need to live in the file that uses them, and this stays a small, self-contained
// block rather than risking a shared-module refactor of the main site's working root layout.
const cardinal = localFont({
  src: [
    { path: "../../fonts/cardinal-medium.woff2", weight: "500", style: "normal" },
    { path: "../../fonts/cardinal-semibold.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-cardinal",
  display: "swap",
});

const founders = localFont({
  src: [
    { path: "../../fonts/founders-grotesk-light.woff2", weight: "300", style: "normal" },
    { path: "../../fonts/founders-grotesk-regular.woff2", weight: "400", style: "normal" },
    { path: "../../fonts/founders-grotesk-bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-founders",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["600", "700", "800"],
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  weight: ["600", "700"],
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const FONT_PRESET_VARS: Record<FontPreset, { display: string; sans: string }> = {
  "fraunces-inter": { display: "var(--font-cardinal)", sans: "var(--font-founders)" },
  "playfair-source-sans": { display: "var(--font-playfair)", sans: "var(--font-source-sans)" },
  "newsreader-manrope": { display: "var(--font-newsreader)", sans: "var(--font-manrope)" },
};

export const metadata: Metadata = {
  title: "Scoring — The Legs Open",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

/**
 * Chrome-free shell for the on-course PIN scoring app (/score/*) -- no header/footer/cookie
 * banner, mirroring the (tools) route group's bare layout, but pulling in the site's real
 * admin-configured branding (primary/accent colours, font preset) the same way the main site's
 * root layout does, so this reads as part of The Legs Open rather than a generic utility page.
 */
export default async function ScoringLayout({ children }: { children: React.ReactNode }) {
  const theme = await getSiteTheme();
  const fontVars = FONT_PRESET_VARS[theme.fontPreset];

  const themeStyle = `:root {
    --primary: ${hexToHslTriplet(theme.primaryColor)};
    --accent: ${hexToHslTriplet(theme.accentColor)};
    --font-display: ${fontVars.display};
    --font-sans: ${fontVars.sans};
  }`;

  return (
    <html lang="en" className={`${cardinal.variable} ${founders.variable} ${playfair.variable} ${sourceSans.variable} ${newsreader.variable} ${manrope.variable}`}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeStyle }} />
      </head>
      <body className="min-h-screen bg-primary font-sans text-primary-foreground antialiased">{children}</body>
    </html>
  );
}
