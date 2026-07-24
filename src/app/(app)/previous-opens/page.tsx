import type { Metadata } from "next";

import { PageHero } from "@/components/shared/page-hero";
import { Container } from "@/components/shared/container";
import { PreviousOpensTimeline } from "@/components/history/previous-opens-timeline";
import { getChampionshipHistory } from "@/lib/data/championships";

export const metadata: Metadata = {
  title: "Previous Opens",
  description: "The full roll of honour for The Legs Open, since 1948.",
};

export default async function PreviousOpensPage() {
  const history = await getChampionshipHistory();

  return (
    <>
      <PageHero
        eyebrow="Since 1948"
        title="Previous Opens"
        description="Every champion, venue and winning margin in The Legs Open's roll of honour."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Previous Opens" }]}
      />
      <Container className="py-16 sm:py-24">
        <PreviousOpensTimeline history={history} />
      </Container>
    </>
  );
}
