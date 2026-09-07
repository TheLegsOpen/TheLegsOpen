import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { getActiveChampionship } from "@/lib/data/scorecards";

const VENUE_TIME_ZONE = "Europe/London";

export interface NewsTickerItem {
  headline: string;
  url: string;
}

function calendarDate(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: VENUE_TIME_ZONE });
}

async function fetchNewsTicker(): Promise<NewsTickerItem[]> {
  const payload = await getPayload({ config: configPromise });
  const [settings, championship] = await Promise.all([payload.findGlobal({ slug: "news-ticker" }), getActiveChampionship(payload)]);

  const items = (settings.items ?? [])
    .filter((item): item is { headline: string; url: string; id?: string | null } => Boolean(item.headline && item.url))
    .slice(0, 4)
    .map((item) => ({ headline: item.headline, url: item.url }));

  if (items.length === 0) return [];
  if (settings.forceShowForTesting) return items;
  if (!championship?.date) return [];

  const isChampionshipDay = calendarDate(new Date(championship.date)) === calendarDate(new Date());
  return isChampionshipDay ? items : [];
}

/**
 * Live only on the active championship's own date (compared as a calendar day in the venue's
 * timezone, not an exact 24h window) -- gone again automatically the day before or after, so
 * nobody has to remember to take it down.
 *
 * Falls back to an empty list instead of throwing -- see the same fallback on getSiteTheme
 * (src/lib/data/site-theme.ts) for why: a Supabase pooler timeout shouldn't 500 a whole page.
 */
export async function getNewsTicker(): Promise<NewsTickerItem[]> {
  try {
    return await fetchNewsTicker();
  } catch {
    return [];
  }
}
