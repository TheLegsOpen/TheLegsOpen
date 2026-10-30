import type { Metadata } from "next";

import { PageHero } from "@/components/shared/page-hero";
import { Container } from "@/components/shared/container";
import { PreviousOpensTimeline } from "@/components/history/previous-opens-timeline";
import { getChampionshipHistory } from "@/lib/data/championships";
import { getSeoSettings } from "@/lib/data/seo-settings";

// See src/app/(app)/page.tsx for why this route is force-dynamic.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoSettings();
  return { title: seo.previousOpens.title, description: seo.previousOpens.description };
}

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
        {/* 1226 is the narrower measure theopen.com puts this page's list in, and the full 1366
            leaves the venue and the champion stranded at opposite ends of a row. Nested rather
            than passed to Container as a max-w override: tailwind-merge does not know
            `max-w-container` is a max-width class, since it is a custom theme key, so it keeps
            both and the sitewide one wins on stylesheet order. The override looks applied in the
            class list and does nothing. */}
        <div className="mx-auto w-full max-w-[1226px]">
          <PreviousOpensTimeline history={history} />
        </div>
      </Container>
    </>
  );
}
