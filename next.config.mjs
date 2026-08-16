import { withPayload } from "@payloadcms/next/withPayload";
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
  // Lets the on-course scoring app be tested over the LAN (phone/laptop on the same WiFi hitting
  // this machine's IP) -- without this, Next's dev server blocks its own Fast Refresh/HMR
  // websocket for any origin other than localhost, which can leave a tab running a stale,
  // partially-patched build after a live edit instead of a clean full reload.
  allowedDevOrigins: ["192.168.0.37"],
};

export default withPayload(nextConfig);
