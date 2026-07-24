import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { PageHero } from "@/components/shared/page-hero";
import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { Countdown } from "@/components/shared/countdown";
import { PlaceholderArt } from "@/components/shared/placeholder-art";
import { CTASection } from "@/components/shared/cta-section";
import { Button } from "@/components/ui/button";
import { getVenueBySlug } from "@/lib/data/venues";
import { getChampionshipsByVenueSlug } from "@/lib/data/championships";
import { getUpcomingChampionship } from "@/lib/data/homepage-settings";
import { ordinal } from "@/lib/utils";

interface UpcomingYearPageProps {
  params: Promise<{ year: string }>;
}

export async function generateStaticParams() {
  const championship = await getUpcomingChampionship();
  return [{ year: String(championship.year) }];
}

export async function generateMetadata({ params }: UpcomingYearPageProps): Promise<Metadata> {
  const { year } = await params;
  const championship = await getUpcomingChampionship();
  const venue = String(championship.year) === year ? await getVenueBySlug(championship.venueSlug) : undefined;
  if (!venue) return {};
  return {
    title: `${venue.name} ${championship.year}`,
    description: `${ordinal(championship.number)} Legs Open at ${venue.name}, ${championship.dates}.`,
  };
}

export default async function UpcomingChampionshipPage({ params }: UpcomingYearPageProps) {
  const { year } = await params;
  const championship = await getUpcomingChampionship();
  const venue = String(championship.year) === year ? await getVenueBySlug(championship.venueSlug) : undefined;
  if (!venue) notFound();

  const previousVisits = await getChampionshipsByVenueSlug(venue.slug);

  return (
    <>
      <PageHero
        variant="photo"
        imageLabel={venue.imageLabel}
        eyebrow={`${ordinal(championship.number)} Legs Open`}
        title={`${venue.name} ${championship.year}`}
        description={`${championship.dates} · ${venue.location}`}
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Tickets & Hospitality", href: "/tickets-and-hospitality" }, { label: String(championship.year) }]}
      />

      <Container className="flex flex-col gap-6 py-16 sm:flex-row sm:items-center sm:justify-between sm:py-20">
        <div className="flex flex-col gap-2">
          <h2 className="font-display font-bold text-display-sm">The ballot opens soon</h2>
          <p className="max-w-md text-muted-foreground">
            Register your interest now for early access when the public ballot for {venue.name} opens.
          </p>
        </div>
        <div className="flex flex-col items-start gap-4 rounded-xl bg-primary px-6 py-6 text-primary-foreground sm:items-end">
          <Countdown targetIso={championship.ballotCloses} />
          <Button asChild variant="accent" size="lg">
            <Link href="/club">Join The Clubhouse</Link>
          </Button>
        </div>
      </Container>

      <Container className="grid gap-10 py-16 sm:py-20 lg:grid-cols-2 lg:items-center">
        <div className="flex flex-col gap-4">
          <SectionHeading eyebrow="About the venue" title={venue.name} />
          <div className="flex flex-col gap-4 text-base leading-relaxed text-muted-foreground">
            {venue.overview.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
          <Link
            href={`/venues/${venue.slug}`}
            className="inline-flex w-fit items-center gap-1 text-sm font-bold uppercase tracking-wide text-primary transition-colors hover:text-accent"
          >
            Full venue guide <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <PlaceholderArt label={venue.imageLabel} tone="dusk" ratio="4/3" showCaption />
      </Container>

      {previousVisits.length > 0 ? (
        <Container className="py-16 sm:py-20">
          <SectionHeading eyebrow="Championship History" title={`Previous Opens at ${venue.name}`} />
          <ul className="mt-8 flex flex-col divide-y divide-border border-y border-border">
            {previousVisits.map((c) => (
              <li key={c.year} className="flex items-center justify-between gap-4 py-4 text-sm">
                <Link href={`/previous-opens/${c.year}`} className="font-medium hover:text-primary hover:underline">
                  {c.year}
                </Link>
                <span>{c.winnerName}</span>
                <span className="text-muted-foreground">{c.margin}</span>
              </li>
            ))}
          </ul>
        </Container>
      ) : null}

      <CTASection
        eyebrow="One Club"
        title="Be first in line for tickets"
        description="Free membership takes a few minutes and gets you priority access when the ballot opens."
        primaryAction={{ label: "Join The Clubhouse", href: "/club" }}
        secondaryAction={{ label: "Contact the ticket office", href: "/contact" }}
      />
    </>
  );
}
