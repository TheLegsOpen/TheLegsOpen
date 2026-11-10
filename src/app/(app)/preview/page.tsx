import Link from "next/link";

import { Container } from "@/components/shared/container";

export const dynamic = "force-dynamic";

const PREVIEWS: { href: string; page: string; items: string[] }[] = [
  {
    href: "/preview/venues/dalmahoy",
    page: "Venue (Dalmahoy)",
    items: [
      "13 Hero line: years hosted, location, button",
      "14 The Course and Getting There cards",
      "15 News & Features band",
      "16 Year-by-year history slider (already matches theopen.com, no change)",
      "25 Hole-by-hole course guide",
      "29 Photo gallery (appears once championship photos are added)",
    ],
  },
  { href: "/preview/venues/st-andrews-craigtoun", page: "Venue (Craigtoun, upcoming)", items: ["13 Upcoming-venue hero line with date", "25 Course guide before it has been played"] },
  { href: "/preview/players/stevie-anderson", page: "Player", items: ["21 Overview opens with a standfirst from the bio"] },
  {
    href: "/preview/latest/the-craigtoun-course-to-hold-15th-legs-open",
    page: "Article",
    items: ["22 Two columns with a Related rail", "23 Slimmer header with share icons", "24 More from… row and tag"],
  },
  { href: "/preview/head-to-head", page: "Head-to-head (new)", items: ["26 Compare two players' Legs Open careers"] },
];

export default function PreviewIndex() {
  return (
    <Container className="flex flex-col gap-8 py-14">
      <div className="flex flex-col gap-2">
        <h1 className="font-menu text-[40px] leading-tight text-primary">Layout previews</h1>
        <p className="max-w-2xl text-muted-foreground">
          The proposed changes you asked to see first, on real data. The live pages are unchanged until you approve each one.
        </p>
      </div>
      <ul className="grid gap-5 md:grid-cols-2">
        {PREVIEWS.map((p) => (
          <li key={p.href} className="border border-border bg-white p-5">
            <Link href={p.href} className="font-menu text-[22px] font-bold uppercase text-primary hover:text-[#2269AB]">
              {p.page} →
            </Link>
            <ul className="mt-3 flex flex-col gap-1 text-sm text-muted-foreground">
              {p.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </Container>
  );
}
