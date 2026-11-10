import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { PageHero } from "@/components/shared/page-hero";
import { Container } from "@/components/shared/container";
import { FieldViewNext } from "@/components/preview/field-view-next";
import { CountdownBanner } from "@/components/preview/countdown-banner";
import { loadFieldPage } from "@/lib/data/field-page";
import { ordinal } from "@/lib/utils";
import { isStillToCome } from "@/lib/data/championship-timing";

export const dynamic = "force-dynamic";

/** PREVIEW of /field with changes 18, 19, 20, 27 and 28. */
export default async function FieldPreviewPage() {
  const { fieldChampionship, sorted, debutantIds, championshipHistory, banners, theme, description } = await loadFieldPage();

  // 20: "up to date as of" -- the most recent edit to any player in the field, which is when the
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
      {/* 27 */}
      {fieldChampionship && upcoming ? (
        <CountdownBanner dateIso={fieldChampionship.effectiveDate} label={`The ${ordinal(fieldChampionship.ordinal)} Legs Open · ${fieldChampionship.venueName}`} />
      ) : null}
      {/* 20 */}
      <div className="bg-white">
        <Container className="flex flex-col gap-3 pt-10">
          <p className="max-w-3xl font-sans text-[21px] font-light leading-8 text-[#2a2a2a]">
            The following players are {upcoming ? "in the field for" : "were in the field at"} {event}.
          </p>
          {asOf ? <p className="text-sm text-[#43524E]">This list is up to date as of {asOf}.</p> : null}
        </Container>
      </div>
      <div className="bg-white">
        <FieldViewNext players={sorted} debutantIds={debutantIds} championshipHistory={championshipHistory} championLogoUrl={theme.championBadgeUrl} />
      </div>
    </>
  );
}
