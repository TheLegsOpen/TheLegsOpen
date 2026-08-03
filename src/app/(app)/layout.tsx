import type { Metadata } from "next";
import { Playfair_Display, Source_Sans_3, Newsreader, Manrope } from "next/font/google";
import localFont from "next/font/local";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CookieBanner } from "@/components/layout/cookie-banner";
import { MotionProvider } from "@/components/providers/motion-provider";
import { SITE } from "@/constants/site";
import { getSiteTheme, type FontPreset } from "@/lib/data/site-theme";
import { getSponsors } from "@/lib/data/sponsors";
import { getSocialLinks } from "@/lib/data/social-links";
import { hexToHslTriplet } from "@/lib/utils";

import "./globals.css";
import "flag-icons/css/flag-icons.min.css";

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

/** Optional alternate face for the sponsor clock widget's course/local time display -- selected per the Sponsor Clock Widget global. */
const timekeeper = localFont({
  src: "../../fonts/timekeeper.woff",
  variable: "--font-timekeeper",
  display: "swap",
});

const FONT_PRESET_VARS: Record<FontPreset, { display: string; sans: string }> = {
  "fraunces-inter": { display: "var(--font-cardinal)", sans: "var(--font-founders)" },
  "playfair-source-sans": { display: "var(--font-playfair)", sans: "var(--font-source-sans)" },
  "newsreader-manrope": { display: "var(--font-newsreader)", sans: "var(--font-manrope)" },
};

export async function generateMetadata(): Promise<Metadata> {
  const theme = await getSiteTheme();

  return {
    metadataBase: new URL(SITE.url),
    title: {
      default: `${SITE.name} | ${SITE.tagline}`,
      template: `%s | ${SITE.name}`,
    },
    description: SITE.description,
    icons: theme.faviconUrl ? { icon: theme.faviconUrl } : undefined,
    openGraph: {
      title: SITE.name,
      description: SITE.description,
      url: SITE.url,
      siteName: SITE.name,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: SITE.name,
      description: SITE.description,
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [theme, sponsors, socialLinks] = await Promise.all([getSiteTheme(), getSponsors(), getSocialLinks()]);
  const fontVars = FONT_PRESET_VARS[theme.fontPreset];

  const themeStyle = `:root {
    --primary: ${hexToHslTriplet(theme.primaryColor)};
    --accent: ${hexToHslTriplet(theme.accentColor)};
    --font-display: ${fontVars.display};
    --font-sans: ${fontVars.sans};
  }`;

  return (
    <html
      lang="en"
      className={`${cardinal.variable} ${founders.variable} ${playfair.variable} ${sourceSans.variable} ${newsreader.variable} ${manrope.variable} ${timekeeper.variable}`}
    >
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeStyle }} />
      </head>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <MotionProvider>
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <Header logoUrl={theme.logoUrl} />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <Footer
            logoUrl={theme.logoUrl}
            patrons={sponsors.patrons}
            officialSuppliers={sponsors.officialSuppliers}
            socialLinks={socialLinks}
          />
          <CookieBanner />
        </MotionProvider>
      </body>
    </html>
  );
}
