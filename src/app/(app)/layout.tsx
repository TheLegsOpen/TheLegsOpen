import type { Metadata } from "next";
import { Fraunces, Inter, Playfair_Display, Source_Sans_3, Newsreader, Manrope } from "next/font/google";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CookieBanner } from "@/components/layout/cookie-banner";
import { MotionProvider } from "@/components/providers/motion-provider";
import { SITE } from "@/constants/site";
import { getSiteTheme, type FontPreset } from "@/lib/data/site-theme";
import { getSponsors } from "@/lib/data/sponsors";
import { hexToHslTriplet } from "@/lib/utils";

import "./globals.css";
import "flag-icons/css/flag-icons.min.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["600", "700", "800"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
  "fraunces-inter": { display: "var(--font-fraunces)", sans: "var(--font-inter)" },
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
  const [theme, sponsors] = await Promise.all([getSiteTheme(), getSponsors()]);
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
      className={`${fraunces.variable} ${inter.variable} ${playfair.variable} ${sourceSans.variable} ${newsreader.variable} ${manrope.variable}`}
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
          />
          <CookieBanner />
        </MotionProvider>
      </body>
    </html>
  );
}
