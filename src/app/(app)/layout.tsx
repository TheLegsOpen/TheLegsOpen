import type { Metadata } from "next";
import localFont from "next/font/local";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { NewsTicker } from "@/components/layout/news-ticker";
import { CookieBanner } from "@/components/layout/cookie-banner";
import { MotionProvider } from "@/components/providers/motion-provider";
import { SITE } from "@/constants/site";
import { getSiteTheme, type FontPreset } from "@/lib/data/site-theme";
import { getSponsors } from "@/lib/data/sponsors";
import { getSocialLinks } from "@/lib/data/social-links";
import { getCookieBannerText } from "@/lib/data/cookie-banner";
import { getMenuVenueLinks } from "@/lib/data/championships";
import { getFooterLegalLinks } from "@/lib/data/legal";
import { getNewsTicker } from "@/lib/data/news-ticker";
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

/** Header nav links only, per explicit request -- not part of the site-wide font-preset system. */
const cardinalPhoto = localFont({
  src: "../../fonts/cardinalphotoweb-regular.woff2",
  variable: "--font-cardinal-photo",
  weight: "400",
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

/** Optional alternate face for the sponsor clock widget's course/local time display -- selected per the Sponsor Clock Widget global. */
const timekeeper = localFont({
  src: "../../fonts/timekeeper.woff",
  variable: "--font-timekeeper",
  display: "swap",
});

const FONT_PRESET_VARS: Record<FontPreset, { display: string; sans: string }> = {
  "fraunces-inter": { display: "var(--font-cardinal)", sans: "var(--font-founders)" },
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
  const [theme, sponsors, socialLinks, cookieBannerText, venueLinks, legalLinks, tickerItems] = await Promise.all([
    getSiteTheme(),
    getSponsors(),
    getSocialLinks(),
    getCookieBannerText(),
    getMenuVenueLinks(),
    getFooterLegalLinks(),
    getNewsTicker(),
  ]);
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
      className={`${cardinal.variable} ${cardinalPhoto.variable} ${founders.variable} ${timekeeper.variable}`}
    >
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeStyle }} />
      </head>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <MotionProvider>
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <Header logoUrl={theme.logoUrl} venueLinks={venueLinks} />
          {/* Sits in the layout rather than the homepage so it runs on every page, under the
              header, the way The Open's live band does. Renders nothing when there is no ticker
              content, so pages outside a championship are unaffected. */}
          <NewsTicker items={tickerItems} />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <Footer
            logoUrl={theme.logoUrl}
            patrons={sponsors.patrons}
            officialSuppliers={sponsors.officialSuppliers}
            socialLinks={socialLinks}
            legalLinks={legalLinks}
          />
          <CookieBanner logoUrl={theme.logoUrl} {...cookieBannerText} />
        </MotionProvider>
      </body>
    </html>
  );
}
