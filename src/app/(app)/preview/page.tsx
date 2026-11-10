import Link from "next/link";

import { Container } from "@/components/shared/container";

export const dynamic = "force-dynamic";

const PREVIEWS: { href: string; page: string; items: string[] }[] = [
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
