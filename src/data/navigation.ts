import type { NavLink, NavPanelGroup, NavSection } from "@/types/nav";

export const PRIMARY_NAV: NavSection[] = [
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Tee Times", href: "/tee-times" },
  { label: "Records", href: "/records" },
];

/** Reserved for a second tier of top-bar links. Empty since The Clubhouse was removed; the header
 * and the panel both skip it while there is nothing in it. */
export const SECONDARY_NAV: NavSection[] = [];

/**
 * The panel's groups, with the "Venues" group supplied at render time.
 *
 * That group used to be a hardcoded pair of courses left over from the original scaffold --
 * Seabrook Old Course and Marram Bay Links, neither of which exists, both linking to pages that
 * 404. It is now driven by the championships in the database: see getMenuVenueLinks. Passing []
 * (or a database failure, which yields []) simply omits the group rather than showing an empty
 * heading.
 */
export function buildNavPanel(venueLinks: NavLink[] = []): NavPanelGroup[] {
  return [
    {
      links: [
        ...PRIMARY_NAV,
        { label: "Latest News", href: "/latest" },
        { label: "Venues", href: "/venues" },
      ],
      emphasis: true,
    },
    ...(SECONDARY_NAV.length > 0 ? [{ links: SECONDARY_NAV, emphasis: true }] : []),
    ...(venueLinks.length > 0 ? [{ heading: "Venues", links: venueLinks, emphasis: true }] : []),
    {
      links: [
        { label: "All Venues", href: "/venues" },
        { label: "Field", href: "/field" },
        { label: "Previous Opens", href: "/previous-opens" },
        ],
    },
  ];
}

/**
 * The footer's bottom bar: the site's own fixed pages, then whichever legal pages exist.
 *
 * The legal half used to be hardcoded here, so deleting a legal page in the admin left a link
 * behind pointing at a 404. It is now supplied at render time -- see getFooterLegalLinks.
 */
export function buildFooterLinks(legalLinks: NavLink[] = []): NavLink[] {
  return [
    { label: "Media Centre", href: "/media" },
    { label: "Patrons & Suppliers", href: "/patrons-and-suppliers" },
    { label: "Careers", href: "/careers" },
    ...legalLinks,
  ];
}
