import { SITE } from "@/constants/site";

// Next's manifest.ts file-convention only routes at the app root, not in nested segments (verified
// locally -- a nested manifest.ts 404s), so this is a plain route handler serving the same shape
// at the literal URL /score/manifest.webmanifest instead.
export function GET() {
  const manifest = {
    name: `${SITE.name} — Scoring`,
    short_name: "Scoring",
    description: "On-course hole-by-hole scoring for The Legs Open.",
    start_url: "/score/play",
    scope: "/score/",
    display: "standalone",
    background_color: "#f9fafb",
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
