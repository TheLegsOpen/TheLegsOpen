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
