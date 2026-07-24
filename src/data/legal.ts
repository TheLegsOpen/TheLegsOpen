export interface LegalPage {
  slug: string;
  title: string;
  updated: string;
  body: string[];
}

export const LEGAL_PAGES: LegalPage[] = [
  {
    slug: "privacy-policy",
    title: "Privacy Policy",
    updated: "2026-01-01",
    body: [
      "This is a fictional, educational recreation built to demonstrate front-end engineering patterns. No real personal data is collected by this site.",
      "In a production version of this page, this section would explain what information is collected, why, how long it is retained, and how visitors can exercise their data rights.",
    ],
  },
  {
    slug: "cookie-policy",
    title: "Cookie Policy",
    updated: "2026-01-01",
    body: [
      "This demo site stores a single preference in your browser's local storage to remember whether you've dismissed the cookie banner. Nothing else is tracked.",
      "A production cookie policy would list each cookie or storage key, its purpose, and its expiry.",
    ],
  },
  {
    slug: "website-terms",
    title: "Website Terms & Conditions",
    updated: "2026-01-01",
    body: [
      "This is a non-commercial, educational project. All championship names, players, venues and sponsors referenced on this site are fictional.",
    ],
  },
  {
    slug: "ticket-terms",
    title: "Ticket & Hospitality Terms",
    updated: "2026-01-01",
    body: [
      "All ticket and hospitality information on this site is placeholder content used to demonstrate a realistic ticketing information architecture, and does not represent a real offer for sale.",
    ],
  },
  {
    slug: "modern-slavery-statement",
    title: "Modern Slavery Statement",
    updated: "2026-01-01",
    body: [
      "This is a placeholder statement for a fictional organisation, included to demonstrate the page's information architecture rather than to make any real disclosure.",
      "In a production version of this page, this section would set out the steps a real organisation and its supply chain take to prevent modern slavery and human trafficking, published annually in line with relevant legislation.",
    ],
  },
];
