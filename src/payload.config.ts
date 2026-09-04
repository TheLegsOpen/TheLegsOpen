import { postgresAdapter } from "@payloadcms/db-postgres";
import { resendAdapter } from "@payloadcms/email-resend";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { vercelBlobStorage } from "@payloadcms/storage-vercel-blob";
import path from "path";
import { buildConfig } from "payload";
import { fileURLToPath } from "url";
import sharp from "sharp";

import { Users } from "./collections/Users";
import { Media } from "./collections/Media";
import { Players } from "./collections/Players";
import { Venues } from "./collections/Venues";
import { Articles } from "./collections/Articles";
import { Championships } from "./collections/Championships";
import { LeaderboardEntries } from "./collections/LeaderboardEntries";
import { TeeTimeRounds } from "./collections/TeeTimeRounds";
import { PlayerStatistics } from "./collections/PlayerStatistics";
import { LegalPages } from "./collections/LegalPages";
import { Scorecards } from "./collections/Scorecards";
import { LiveBlogPosts } from "./collections/LiveBlogPosts";
import { LiveBlogTriggerLog } from "./collections/LiveBlogTriggerLog";
import { HomepageSettings } from "./globals/HomepageSettings";
import { CookieBannerSettings } from "./globals/CookieBannerSettings";
import { LiveBlogConfig } from "./globals/LiveBlogConfig";
import { SiteTheme } from "./globals/SiteTheme";
import { SponsorClock } from "./globals/SponsorClock";
import { TournamentStatus } from "./globals/TournamentStatus";
import { NewsTicker } from "./globals/NewsTicker";
import { PageBanners } from "./globals/PageBanners";
import { Sponsors } from "./globals/Sponsors";
import { SocialLinks } from "./globals/SocialLinks";
import { ContactPageSettings } from "./globals/ContactPageSettings";
import { MediaPageSettings } from "./globals/MediaPageSettings";
import { CareersPageSettings } from "./globals/CareersPageSettings";
import { SEOSettings } from "./globals/SEOSettings";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: " — The Legs Open Admin",
      icons: [{ url: "/icon.svg", type: "image/svg+xml" }],
    },
    components: {
      graphics: {
        Logo: "/components/admin/BrandLogo#BrandLogo",
        Icon: "/components/admin/BrandIcon#BrandIcon",
      },
    },
  },
  collections: [
    Users,
    Media,
    Players,
    Venues,
    Articles,
    Championships,
    LeaderboardEntries,
    TeeTimeRounds,
    PlayerStatistics,
    LegalPages,
    Scorecards,
    LiveBlogPosts,
    LiveBlogTriggerLog,
  ],
  globals: [
    HomepageSettings,
    CookieBannerSettings,
    LiveBlogConfig,
    SiteTheme,
    SponsorClock,
    TournamentStatus,
    NewsTicker,
    PageBanners,
    Sponsors,
    SocialLinks,
    ContactPageSettings,
    MediaPageSettings,
    CareersPageSettings,
    SEOSettings,
  ],
  editor: lexicalEditor(),
  // Without this, Payload has nowhere to actually deliver account emails (forgot-password
  // chief among them) -- it just logs the subject line and drops the message. defaultFromAddress
  // must be on a domain verified with Resend (Settings > Domains in the Resend dashboard), or
  // Resend will reject the send.
  email: resendAdapter({
    apiKey: process.env.RESEND_API_KEY || "",
    defaultFromAddress: "admin@thelegsopen.com",
    defaultFromName: "The Legs Open",
  }),
  secret: process.env.PAYLOAD_SECRET || "",
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || "",
      // Unset, this defaults to pg's own connectionTimeoutMillis: 0 -- an exhausted or stalled
      // pool then waits forever instead of failing fast. Raising max didn't resolve the sustained
      // local slowness on investigation (see conversation), so that's left at pg's own default;
      // this timeout at least turns a silent multi-second hang into a fast, diagnosable error.
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    },
  }),
  sharp,
  plugins: [
    vercelBlobStorage({
      collections: {
        media: true,
      },
      token: process.env.BLOB_READ_WRITE_TOKEN,
    }),
  ],
});
