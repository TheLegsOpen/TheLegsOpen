import type { Payload, PayloadRequest, CollectionAfterChangeHook, CollectionAfterDeleteHook } from "payload";

/**
 * Derives a venue's timesHosted/firstHosted/lastHosted from the championships actually recorded
 * at it, in the same spirit as computeChampionshipAutoStats in lib/data/championship-stats.ts.
 *
 * These three were typed by hand, and by November 2026 three of the fifteen venues disagreed with
 * the championship records -- Carnwath stored 2012 against a 2013 championship, Dundonald 2013
 * against 2014, Southerness 2014 against 2016. The venue page had already stopped reading them for
 * that reason and derives its Championship Record rail from the championships table instead, which
 * is why those pages displayed correctly while the stored values were wrong. Deriving them here
 * closes the gap at the source, so the admin cannot drift from what the site renders.
 */

export interface VenueHosting {
  timesHosted: number;
  firstHosted: number;
  lastHosted: number;
}

/**
 * Zero rather than null for a venue that has never hosted. The fields are `required`, so null
 * would fail validation, and 0/0/0 is already what Old Petty -- the practice course -- holds.
 */
const NEVER_HOSTED: VenueHosting = { timesHosted: 0, firstHosted: 0, lastHosted: 0 };

export async function computeVenueHosting(payload: Payload, venueId: string | number, req?: PayloadRequest): Promise<VenueHosting> {
  const championships = await payload.find({
    collection: "championships",
    where: { venue: { equals: venueId } },
    limit: 100,
    depth: 0,
    pagination: false,
    req,
  });

  const years = championships.docs.map((doc) => doc.year).filter((year): year is number => typeof year === "number");
  if (years.length === 0) return NEVER_HOSTED;

  years.sort((a, b) => a - b);
  return { timesHosted: years.length, firstHosted: years[0], lastHosted: years[years.length - 1] };
}

/** A relationship field arrives either as the id or as the populated document, depending on depth. */
function relationshipId(value: unknown): string | number | undefined {
  if (value == null) return undefined;
  if (typeof value === "object") {
    const id = (value as { id?: string | number }).id;
    return id ?? undefined;
  }
  return value as string | number;
}

async function syncVenue(payload: Payload, venueId: string | number, req?: PayloadRequest): Promise<void> {
  const hosting = await computeVenueHosting(payload, venueId, req);
  await payload.update({ collection: "venues", id: venueId, data: hosting, req, context: { skipHostingDerive: true } });
}

/**
 * Keeps the hosting figures right when a championship changes rather than only when the venue is
 * next saved. Without this the fields would be read-only *and* quietly stale -- the venue's own
 * hook cannot know that a championship was added somewhere else, so adding the 2027 championship
 * would leave that venue still reading 0/0/0 until someone happened to open and save it.
 *
 * previousDoc matters because a championship can be moved between venues: the one it left needs
 * recounting as much as the one it joined.
 */
export const syncVenueHostingAfterChange: CollectionAfterChangeHook = async ({ doc, previousDoc, req }) => {
  const ids = new Set<string | number>();
  const current = relationshipId(doc?.venue);
  const previous = relationshipId(previousDoc?.venue);
  if (current != null) ids.add(current);
  if (previous != null) ids.add(previous);

  for (const id of ids) await syncVenue(req.payload, id, req);
};

export const syncVenueHostingAfterDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
  const id = relationshipId(doc?.venue);
  if (id != null) await syncVenue(req.payload, id, req);
};
