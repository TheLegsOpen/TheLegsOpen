import type { NavLink, NavPanelGroup, NavSection } from "@/types/nav";

export const PRIMARY_NAV: NavSection[] = [
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Tee Times", href: "/tee-times" },
  { label: "Records", href: "/records" },
  { label: "Shop", href: "/shop" },
];

export const SECONDARY_NAV: NavSection[] = [{ label: "The Clubhouse", href: "/club" }];

/**
 * Content for the single comprehensive slide-in panel (opened via the
 * hamburger icon, shown on every viewport size) rather than per-item hover
 * mega-menus — matches the reference site's actual nav pattern, where the
 * top bar is direct links and deeper IA lives in one panel.
 */
export const NAV_PANEL: NavPanelGroup[] = [
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
  {
    heading: "Venues",
    links: [
      { label: "Seabrook Old Course", href: "/venues/seabrook-old-course", description: "154th Legs Open" },
      { label: "Marram Bay Links", href: "/venues/marram-bay-links", description: "155th Legs Open" },
    ],
    emphasis: true,
  },
  {
    links: [
      { label: "All Venues", href: "/venues" },
      { label: "Field", href: "/field" },
      { label: "Previous Opens", href: "/previous-opens" },
      { label: "Contact Us", href: "/contact" },
    ],
  },
];

/** Support + legal links shown as a single side-by-side row in the footer's bottom bar. */
export const FOOTER_LINKS: NavLink[] = [
  { label: "Contact Us", href: "/contact" },
  { label: "Media Centre", href: "/media" },
  { label: "Patrons & Suppliers", href: "/patrons-and-suppliers" },
  { label: "Careers", href: "/careers" },
  { label: "Privacy Policy", href: "/legal/privacy-policy" },
  { label: "Cookie Policy", href: "/legal/cookie-policy" },
  { label: "Website Terms", href: "/legal/website-terms" },
  { label: "Modern Slavery Statement", href: "/legal/modern-slavery-statement" },
];
