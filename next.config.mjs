import { withPayload } from "@payloadcms/next/withPayload";
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
  // Vercel's ISR/edge cache is keyed per-hostname -- thelegsopen.com, www.thelegsopen.com and the
  // auto-generated the-legs-open.vercel.app were all live simultaneously, each with its own
  // independently-aging cache, splitting cache-warming traffic three ways (confirmed live: same
  // page, same ETag, different Age headers on each). The lower-traffic ones then sit stale far
  // longer between regenerations (observed 800+s stale on thelegsopen.com vs ~150s on
  // the-legs-open.vercel.app at the same moment, see the `revalidate` comments in
  // src/app/(app)/page.tsx and friends). thelegsopen.com (apex, no www) is the canonical domain --
  // redirect the other two into it so all real traffic (and cache-warming) lands on one hostname.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "the-legs-open.vercel.app" }],
        destination: "https://thelegsopen.com/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.thelegsopen.com" }],
        destination: "https://thelegsopen.com/:path*",
        permanent: true,
      },
    ];
  },
  // Lets the on-course scoring app be tested over the LAN (phone/laptop on the same WiFi hitting
  // this machine's IP) -- without this, Next's dev server blocks its own Fast Refresh/HMR
  // websocket for any origin other than localhost, which can leave a tab running a stale,
  // partially-patched build after a live edit instead of a clean full reload.
  allowedDevOrigins: ["192.168.0.37"],
  experimental: {
    // Defaults to (CPU cores - 1) -- 7 workers on Vercel's 8-core Pro build machine, each opening
    // its own Postgres connection pool while generating pages in parallel. That repeatedly
    // exhausted Supabase's connection ceiling on the free Nano compute tier ("timeout exceeded
    // when trying to connect" on a handful of pages per build, even with each pool capped to a
    // single connection -- see the pool config in payload.config.ts). Capping build concurrency
    // itself, rather than continuing to shrink the per-worker pool, directly fixes the actual
    // cause: 2 workers x 1 connection is a small, predictable load Nano can always serve, with
    // real headroom left over for live traffic and admin usage at the same time.
    cpus: 2,
  },
};

export default withPayload(nextConfig);
