/**
 * Free, no-API-key geocoding via OpenStreetMap's Nominatim service -- appropriate here since this
 * only fires on an infrequent, human-initiated admin save (never at build/request time), well
 * within Nominatim's usage policy (max ~1 req/s, a descriptive User-Agent, no bulk/automated use).
 * https://operations.osmfoundation.org/policies/nominatim/
 */
export interface GeocodeResult {
  latitude: number;
  longitude: number;
}

export async function geocodeAddress(query: string): Promise<GeocodeResult | undefined> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "TheLegsOpenSite/1.0 (thelegsopen.com)" },
    });
    if (!res.ok) return undefined;

    const results = (await res.json()) as { lat: string; lon: string }[];
    const first = results[0];
    if (!first) return undefined;

    const latitude = Number(first.lat);
    const longitude = Number(first.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return undefined;

    return { latitude, longitude };
  } catch {
    // Never block a save on a third-party lookup failing -- the admin can still fill these in by hand.
    return undefined;
  }
}

/**
 * Tries the venue's own name alone first, then progressively adds more context only if that
 * fails. Nominatim's free-text search treats comma-separated terms as an address hierarchy
 * (street/city/county/country) -- confirmed against the real service that a well-known, entirely
 * unambiguous course name (e.g. "Dundonald Links") resolves cleanly on its own, but appending a
 * location/region that doesn't precisely match how OSM's own data has that place tagged (its
 * `location` field said "Troon", OSM has it under Irvine/North Ayrshire) makes the whole query
 * return nothing. Most-specific-name-only first, broadest-context last, is the order that
 * actually works in practice rather than the one that looks most "complete".
 */
export async function geocodeVenue(parts: { name?: string; location?: string; region?: string; country?: string }): Promise<GeocodeResult | undefined> {
  const candidates = [
    parts.name,
    [parts.name, parts.location].filter(Boolean).join(", "),
    [parts.name, parts.location, parts.region, parts.country].filter(Boolean).join(", "),
  ].filter((q): q is string => Boolean(q));

  const uniqueCandidates = candidates.filter((q, i) => q !== candidates[i - 1]);

  for (const query of uniqueCandidates) {
    const result = await geocodeAddress(query);
    if (result) return result;
  }
  return undefined;
}
