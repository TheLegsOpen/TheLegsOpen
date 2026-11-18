import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { PRIMARY_NAV, buildNavPanel } from "@/data/navigation";
import type { NavLink, NavPanelGroup, NavSection } from "@/types/nav";

export interface MainMenu {
  topLinks: NavSection[];
  groups: NavPanelGroup[];
}

type LinkRow = { label?: string | null; href?: string | null };

function links(rows: LinkRow[] | null | undefined): NavLink[] {
  return (rows ?? []).filter((r) => r.label?.trim() && r.href?.trim()).map((r) => ({ label: r.label!.trim(), href: r.href!.trim() }));
}

/** The menu as it was written in src/data/navigation.ts, used until Main Menu is first saved. */
function fallback(venueLinks: NavLink[]): MainMenu {
  return { topLinks: PRIMARY_NAV, groups: buildNavPanel(venueLinks) };
}

/**
 * The header's top-bar links and the slide-out panel's groups, from the Main Menu global. Once it
 * has been saved (it has a createdAt) it is the whole truth, empty groups and all; before that,
 * and if the database can't be reached, the menu written in the code is used so the site never
 * loses its navigation. The automatic Venues group is placed after the first group, as before.
 */
export async function getMainMenu(venueLinks: NavLink[] = []): Promise<MainMenu> {
  try {
    const payload = await getPayload({ config: configPromise });
    const menu = await payload.findGlobal({ slug: "main-menu", depth: 0 });
    if (!menu?.createdAt) return fallback(venueLinks);
    const groups: NavPanelGroup[] = (menu.groups ?? [])
      .map((g) => ({ heading: g.heading?.trim() || undefined, emphasis: Boolean(g.emphasis), links: links(g.links) }))
      .filter((g) => g.links.length > 0);
    if (menu.showVenueLinks !== false && venueLinks.length > 0) {
      groups.splice(Math.min(1, groups.length), 0, { heading: "Venues", links: venueLinks, emphasis: true });
    }
    return { topLinks: links(menu.topLinks), groups };
  } catch {
    return fallback(venueLinks);
  }
}
