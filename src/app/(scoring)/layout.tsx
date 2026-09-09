import type { Metadata, Viewport } from "next";
import { Playfair_Display, Source_Sans_3, Newsreader, Manrope } from "next/font/google";
import localFont from "next/font/local";

import { getSiteTheme, type FontPreset } from "@/lib/data/site-theme";
import { hexToHslTriplet } from "@/lib/utils";
import { ServiceWorkerRegistration } from "@/components/scoring/service-worker-registration";
import { IosInstallHint } from "@/components/scoring/ios-install-hint";

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
  manifest: "/score/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Legs Open Scoring",
  },
  icons: {
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Deliberately no maximumScale / userScalable: false. Locking zoom is a habit borrowed from
  // app-like shells, but this one is used outdoors, in sunlight, at arm's length, by players who
  // may not have reading glasses on them. Blocking pinch-to-zoom removes their one workaround,
  // and fails WCAG 1.4.4 into the bargain.
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
      {/* min-h-[100svh], not min-h-screen. min-h-screen is 100vh, and vh is the LARGE viewport --
        measured as though the browser's address bar were hidden. With the bar actually showing, the
        body was taller than the visible area, the page gained a scrollbar, and the scoring screen's
        Back / Save buttons sat below the fold until you scrolled. svh is the small viewport (bar
        showing), so the page always fits whichever state the bar is in. */}
      <body className="min-h-[100svh] bg-primary font-sans text-primary-foreground antialiased">
        <ServiceWorkerRegistration />
        <IosInstallHint />
        {children}
      </body>
    </html>
  );
}
