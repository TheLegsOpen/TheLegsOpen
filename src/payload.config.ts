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
      //
      // Raised from 10s to 20s -- Vercel's build machine runs in Washington D.C. (iad1) while this
      // Supabase project is in London (eu-west-2), and switching to the pooler (which has a much
      // smaller 15-connection backend pool, tied to Nano compute) made timeouts *worse*, not
      // better -- ruling out raw connection count as the bottleneck and pointing at that
      // cross-Atlantic latency (plus Nano's limited CPU for the TLS/auth handshake on each new
      // connection) as the real cause. 20s gives a marginal connection more room to succeed instead
      // of being killed just as it was about to.
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 20_000,
      // Capped low deliberately -- Supabase's Nano compute tier only allows 60 total connections,
      // and node-postgres's own default max (10) per pool adds up fast once Vercel's build machine
      // (8 parallel cores on Pro) fans out static generation across many concurrent invocations,
      // each with its own pool. Confirmed via a real build failure: "timeout exceeded when trying
      // to connect" across ~40 /players/[slug] pages generated in parallel. A handful of
      // connections per instance is still plenty for this app's query patterns (one or two queries
      // in flight per request), and leaves headroom for live traffic and admin usage at the same time.
      max: 3,
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
