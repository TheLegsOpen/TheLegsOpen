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
      // DATABASE_URL now points at Supabase's Session pooler (aws-1-eu-west-2.pooler.supabase.com),
      // which Supabase's own docs describe as "IPv4 proxied for free" -- unlike the direct-connection
      // host, which is IPv6-only unless you pay for their IPv4 add-on. That direct-connection host
      // is what the earlier `family: 4` socket override (forcing pg's TCP connect to IPv4) was built
      // for, after builds failed with "connect ENETUNREACH 2a05:..." against it. But that override
      // kept producing a plain 20s "timeout exceeded when trying to connect" hang even after
      // switching DATABASE_URL to this pooler host -- which shouldn't need forcing at all, since it
      // has no IPv6 address to race against. That pointed at the override itself silently breaking
      // every connection attempt (rather than any real unreachable address), so it's removed here;
      // the pooler host's own IPv4-only DNS answer makes Node's default connect behavior sufficient.
      // Unset, this defaults to pg's own connectionTimeoutMillis: 0 -- an exhausted or stalled
      // pool then waits forever instead of failing fast. Raising max didn't resolve the sustained
      // local slowness on investigation (see conversation), so that's left at pg's own default;
      // this timeout at least turns a silent multi-second hang into a fast, diagnosable error.
      //
      // Raised from 10s to 20s -- Vercel's build machine runs in Washington D.C. (iad1) while this
      // Supabase project is in London (eu-west-2), giving every connection real cross-Atlantic
      // latency on top of Nano's limited CPU for the TLS/auth handshake. 20s gives a marginal
      // connection more room to succeed instead of being killed just as it was about to.
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 20_000,
      // Kept as low as possible -- the build log shows "Collecting page data using 7 workers", and
      // Supabase's Nano compute tier caps the pooler's own backend-to-Postgres pool at 15
      // connections. At max: 2 that's 7 x 2 = 14, right against the ceiling with zero margin for
      // any concurrent live traffic or admin usage -- confirmed by builds still failing on a
      // handful of pages even after the IPv4 fix. At max: 1, worst case is 7 connections, leaving
      // real headroom. This app never runs more than one query at a time per request anyway.
      max: 1,
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
