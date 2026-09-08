/**
 * Font loading for server-rendered social images (see /api/tee-graphic).
 *
 * Satori, which backs next/og's ImageResponse, needs real font binaries handed to it -- it cannot
 * use the CSS the site renders with. It accepts TTF, OTF and WOFF, but NOT WOFF2, which rules out
 * src/fonts/* (all woff2 apart from timekeeper). So these are pulled from Google Fonts at runtime.
 *
 * Playfair Display and Source Sans 3 are deliberately the same faces the site itself can be themed
 * with (see the fontPairings map in the app layout), so a generated graphic looks like the site
 * rather than like a separate product.
 */

const GOOGLE_CSS = "https://fonts.googleapis.com/css2";

export interface LoadedFont {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 700 | 900;
  style: "normal" | "italic";
}

/**
 * Module-level cache. A warm serverless instance then renders every later graphic without
 * re-fetching ~400KB of font per image, which is most of the request time otherwise.
 */
const cache = new Map<string, ArrayBuffer>();

async function fetchFontBinary(family: string, axis: string): Promise<ArrayBuffer> {
  const key = `${family}:${axis}`;
  const cached = cache.get(key);
  if (cached) return cached;

  // Google serves woff2 to browsers that advertise support and plain TTF to everything else, so
  // the User-Agent is doing real work here -- without it this returns a woff2 that Satori rejects.
  const cssUrl = `${GOOGLE_CSS}?family=${encodeURIComponent(family)}:${axis}`;
  const cssRes = await fetch(cssUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; TheLegsOpen/1.0)" },
    cache: "force-cache",
  });
  if (!cssRes.ok) throw new Error(`Font CSS request failed for ${family} (${cssRes.status})`);

  const css = await cssRes.text();
  const match = css.match(/src:\s*url\(([^)]+)\)/);
  if (!match) throw new Error(`No font file URL found in Google Fonts CSS for ${family}`);

  const fontRes = await fetch(match[1], { cache: "force-cache" });
  if (!fontRes.ok) throw new Error(`Font download failed for ${family} (${fontRes.status})`);

  const data = await fontRes.arrayBuffer();
  cache.set(key, data);
  return data;
}

/** The four faces the tee-time graphic uses, fetched in parallel. */
export async function loadGraphicFonts(): Promise<LoadedFont[]> {
  const [serifItalic, serif, sans, sansBold] = await Promise.all([
    fetchFontBinary("Playfair Display", "ital,wght@1,900"),
    fetchFontBinary("Playfair Display", "wght@700"),
    fetchFontBinary("Source Sans 3", "wght@400"),
    fetchFontBinary("Source Sans 3", "wght@700"),
  ]);

  return [
    { name: "Playfair", data: serifItalic, weight: 900, style: "italic" },
    { name: "Playfair", data: serif, weight: 700, style: "normal" },
    { name: "SourceSans", data: sans, weight: 400, style: "normal" },
    { name: "SourceSans", data: sansBold, weight: 700, style: "normal" },
  ];
}
