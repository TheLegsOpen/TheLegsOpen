import type { Metadata } from "next";
import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { PageHero } from "@/components/shared/page-hero";
import { Container } from "@/components/shared/container";
import { FieldView } from "@/components/field/field-view";
import { CountdownBanner } from "@/components/field/countdown-banner";
import { loadFieldPage } from "@/lib/data/field-page";
import { ordinal } from "@/lib/utils";
import { isStillToCome } from "@/lib/data/championship-timing";
import { getSeoSettings } from "@/lib/data/seo-settings";

// See src/app/(app)/page.tsx for why this route is force-dynamic.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoSettings();
  return { title: seo.field.title, description: seo.field.description };
}

export default async function FieldPage() {
  const { fieldChampionship, sorted, debutantIds, championshipHistory, banners, theme, description } = await loadFieldPage();

  // "Up to date as of": the most recent edit to any player in the field, which is when the
  // In Current Field ticks last changed (or near enough: any edit to a fielded player counts).
  const payload = await getPayload({ config: configPromise });
  const latest = await payload.find({ collection: "players", where: { inField: { equals: true } }, sort: "-updatedAt", limit: 1, depth: 0 });
  const asOf = latest.docs[0]?.updatedAt
    ? new Date(latest.docs[0].updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" })
    : undefined;

  const event = fieldChampionship ? `the ${ordinal(fieldChampionship.ordinal)} Legs Open at ${fieldChampionship.venueName}` : "The Legs Open";
  const upcoming = fieldChampionship && isStillToCome({ year: fieldChampionship.year, date: fieldChampionship.effectiveDate });

  return (
    <>
      <PageHero
        variant="photo"
        size="compact"
        imageLabel="The field walking down the 1st fairway"
        imageUrl={banners.fieldUrl}
        eyebrow={banners.fieldEyebrow}
        title={banners.fieldTitle}
        description={description}
      />
      {fieldChampionship && upcoming ? (
        <CountdownBanner dateIso={fieldChampionship.effectiveDate} label={`The ${ordinal(fieldChampionship.ordinal)} Legs Open · ${fieldChampionship.venueName}`} />
      ) : null}
      <div className="bg-white">
        <Container className="flex flex-col gap-3 pt-10">
          <p className="max-w-3xl font-sans text-[21px] font-light leading-8 text-[#2a2a2a]">
            The following players are {upcoming ? "in the field for" : "were in the field at"} {event}.
          </p>
          {asOf ? <p className="text-sm text-[#43524E]">This list is up to date as of {asOf}.</p> : null}
        </Container>
      </div>
      <div className="bg-white">
        <FieldView players={sorted} debutantIds={debutantIds} championshipHistory={championshipHistory} championLogoUrl={theme.championBadgeUrl} />
      </div>
    </>
  );
}
