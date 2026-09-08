import { postgresAdapter } from "@payloadcms/db-postgres";
import { resendAdapter } from "@payloadcms/email-resend";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { vercelBlobStorage } from "@payloadcms/storage-vercel-blob";
import dns from "dns";
import path from "path";
import { buildConfig } from "payload";
import { fileURLToPath } from "url";
import sharp from "sharp";

// Every Postgres connection attempt from Vercel's BUILD machine has been hanging for exactly our
// configured connectionTimeoutMillis (~20s) regardless of which Supabase host/port we point at
// (direct, transaction pooler, session pooler) and regardless of build machine tier -- while the
// already-deployed site's serverless functions reach the same database instantly. That rules out
// the connection string, a prior custom IPv4 socket override (removed), build concurrency, and
// Supabase-side network restrictions/bans (checked: none configured). What's left is DNS address
// selection: Node 18+'s default `dns.lookup()` order is "verbatim" -- whatever order the resolver
// hands back, potentially an IPv6 address first -- and if that address is unreachable from the build
// sandbox specifically (serverless functions may resolve/route differently), Node hangs waiting on
// that attempt with no fallback until our own timeout fires. This is Node's own documented fix:
// force IPv4 first for every lookup in this process, independent of any single Postgres client.
dns.setDefaultResultOrder("ipv4first");

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
      // Required now that "Enforce SSL on incoming connections" is on in Supabase (2026-09-07,
      // following their support's diagnosis of "could not accept SSL connection: EOF detected" in
      // their Postgres logs) -- without this, pg never attempts SSL at all, and the pooler now
      // rejects every connection outright with (ESSLREQUIRED). rejectUnauthorized: false because
      // Supabase's pooler certificate isn't in Node's default trust store; this still encrypts the
      // connection, it just doesn't verify the certificate chain against a CA bundle.
      ssl: { rejectUnauthorized: false },
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
      // WHAT WAS ACTUALLY WRONG (2026-09-08). For a day and a half this pool produced
      // "timeout exceeded when trying to connect" on most requests, and every theory that blamed
      // Supabase (IPv6, credentials, compute size, SSL, pooler health) turned out to be wrong.
      // A diagnostic route (/api/db-ping, temporary) measured four things from inside the same
      // Vercel function, at the same moment, on this same DATABASE_URL:
      //
      //   bare pg Client         ok,   588 ms
      //   raw pg Pool, max 1     ok,   629 ms   (two concurrent queries)
      //   raw pg Pool, max 5     ok,   555 ms
      //   THIS pool (Payload)    FAILED, 20,523 ms
      //
      // ...while this pool's own counters read `total: 1, idle: 0`. So the network and the pooler
      // were never the problem: this pool was holding its single connection and never getting it
      // back. Every later query queued behind it and gave up after connectionTimeoutMillis.
      //
      // The trap is that node-postgres uses the wording "timeout exceeded when trying to connect"
      // for BOTH a failed handshake and a pool-queue timeout. It reads like a network fault and
      // isn't one. The tell is the timing: a queue timeout lands on connectionTimeoutMillis to the
      // millisecond (20,001 ms), where a real handshake failure varies.
      //
      // Cause: Vercel freezes an instance between invocations. A connection still open at freeze
      // time is dead when the instance thaws, but the pool still counts it. Three settings below
      // are what keep that from being fatal.
      //
      // idleTimeoutMillis, back down to 10s from the 60s tried on 2026-09-07. That 60s change was
      // meant to keep a connection warm between admin clicks; what it actually did was hold
      // connections open long enough to be caught by a freeze, which is what turned an occasional
      // failure into a constant one.
      idleTimeoutMillis: 10_000,
      // Drop idle clients rather than keeping them (and the pool) alive between invocations --
      // the recommended posture for serverless, and the counterpart to the short idle timeout.
      allowExitOnIdle: true,
      connectionTimeoutMillis: 20_000,
      // Not 1. At max: 1 a single dead-on-thaw connection starves the instance permanently, which
      // is exactly what was happening. Kept modest rather than large because DATABASE_URL points
      // at Supabase's *session* pooler, where each client holds a backend connection for the whole
      // session and the ceiling is therefore the pool size (15) -- max: 3 briefly hit
      // "(EMAXCONNSESSION) max clients reached in session mode" on 2026-09-07 under load, though
      // that was also while SSL was misconfigured and connections were churning. If concurrency
      // ever needs to go higher than this, the answer is transaction-mode pooling (port 6543),
      // not a bigger number here.
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
