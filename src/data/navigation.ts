import type { NavLink, NavPanelGroup, NavSection } from "@/types/nav";

export const PRIMARY_NAV: NavSection[] = [
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Tee Times", href: "/tee-times" },
  { label: "Records", href: "/records" },
];

export const SECONDARY_NAV: NavSection[] = [{ label: "The Clubhouse", href: "/club" }];

/**
 * Content for the single comprehensive slide-in panel (opened via the
 * hamburger icon, shown on every viewport size) rather than per-item hover
 * mega-menus — matches the reference site's actual nav pattern, where the
 * top bar is direct links and deeper IA lives in one panel.
 */
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
    {
      links: SECONDARY_NAV,
      emphasis: true,
    },
    ...(venueLinks.length > 0 ? [{ heading: "Venues", links: venueLinks, emphasis: true }] : []),
    {
      links: [
        { label: "All Venues", href: "/venues" },
        { label: "Field", href: "/field" },
        { label: "Previous Opens", href: "/previous-opens" },
        { label: "Contact Us", href: "/contact" },
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
    { label: "Contact Us", href: "/contact" },
    { label: "Media Centre", href: "/media" },
    { label: "Patrons & Suppliers", href: "/patrons-and-suppliers" },
    { label: "Careers", href: "/careers" },
    ...legalLinks,
  ];
}
