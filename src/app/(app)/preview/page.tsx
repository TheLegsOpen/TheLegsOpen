import Link from "next/link";

import { Container } from "@/components/shared/container";

export const dynamic = "force-dynamic";

const PREVIEWS: { href: string; page: string; items: string[] }[] = [
  {
    href: "/preview/venues/dalmahoy",
    page: "Venue (Dalmahoy)",
    items: [
      "13 Hero line: years hosted, location, button to the most recent Legs Open here",
      "The Course card under Upcoming Venues, linking to the course page (Getting There removed)",
      "One selected article after the intro (the venue's first Featured Article, else the latest from its last championship)",
      "Overview and Course Statistics tabs removed (hole scoring is on each Previous Opens page)",
      "16 Year-by-year history slider (already matches theopen.com, no change)",
      "29 Photo gallery (appears once championship photos are added)",
    ],
  },
  {
    href: "/preview/venues/dalmahoy/course",
    page: "Course page (Dalmahoy)",
    items: ["25 Hole-by-hole guide: pick a hole to see its strokesaver image and numbers (placeholders until hole images can be uploaded)"],
  },
  { href: "/preview/venues/st-andrews-craigtoun", page: "Venue (Craigtoun, upcoming)", items: ["13 Upcoming-venue hero line with date"] },
  { href: "/preview/venues/st-andrews-craigtoun/course", page: "Course page (Craigtoun)", items: ["25 Course guide before it has been played"] },
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
