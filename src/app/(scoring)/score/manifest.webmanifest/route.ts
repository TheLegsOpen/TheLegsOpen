import { SITE } from "@/constants/site";

// Next's manifest.ts file-convention only routes at the app root, not in nested segments (verified
// locally -- a nested manifest.ts 404s), so this is a plain route handler serving the same shape
// at the literal URL /score/manifest.webmanifest instead.
export function GET() {
  const manifest = {
    name: `${SITE.name} — Scoring`,
    // The home-screen icon label uses short_name, not name -- this is what actually shows under
    // the installed app icon, so it needs to read as the club's name, not the generic feature.
    short_name: SITE.name,
    description: "On-course hole-by-hole scoring for The Legs Open.",
    start_url: "/score/play",
    scope: "/score/",
    display: "standalone",
    // Android builds its launch splash screen from this color plus the icon -- matching it to
    // theme_color (the site's dark navy) makes that screen read as a branded loading state
    // instead of the icon floating on a plain off-white box.
    background_color: "#06051e",
    theme_color: "#06051e",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };

  return Response.json(manifest, {
    headers: { "Content-Type": "application/manifest+json" },
  });
}
