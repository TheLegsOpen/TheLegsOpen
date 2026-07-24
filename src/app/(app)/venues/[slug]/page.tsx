import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Container } from "@/components/shared/container";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PlaceholderArt } from "@/components/shared/placeholder-art";
import { StatBlock } from "@/components/venues/stat-block";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAllVenueSlugs, getVenueBySlug } from "@/lib/data/venues";
import { getChampionshipsByVenueSlug } from "@/lib/data/championships";
import { getUpcomingChampionship } from "@/lib/data/homepage-settings";
import { ordinal } from "@/lib/utils";

interface VenuePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = await getAllVenueSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: VenuePageProps): Promise<Metadata> {
  const { slug } = await params;
  const venue = await getVenueBySlug(slug);
  if (!venue) return {};
  return { title: venue.name, description: venue.description };
}

export default async function VenueDetailPage({ params }: VenuePageProps) {
  const { slug } = await params;
  const venue = await getVenueBySlug(slug);
  if (!venue) notFound();

  const [championshipsHere, upcomingChampionship] = await Promise.all([
    getChampionshipsByVenueSlug(venue.slug),
    getUpcomingChampionship(),
  ]);
  const upcoming = upcomingChampionship.venueSlug === venue.slug ? upcomingChampionship : undefined;

  return (
    <Container className="flex flex-col gap-10 py-10 sm:py-14">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Venues", href: "/venues" }, { label: venue.name }]} />

      {upcoming ? (
        <Link
          href={`/tickets-and-hospitality/${upcoming.year}`}
          className="group flex flex-col gap-2 border border-accent bg-secondary p-6 transition-colors hover:bg-accent/10 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
              {ordinal(upcoming.number)} Legs Open · {upcoming.dates}
            </p>
            <p className="font-display text-lg font-bold">{venue.name} returns to the rotation in {upcoming.year}</p>
          </div>
          <span className="inline-flex w-fit items-center gap-1 text-sm font-bold uppercase tracking-wide text-primary group-hover:text-accent">
            Ballot & tickets <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
        <div className="flex flex-col gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{venue.region}</span>
          <h1 className="font-display font-bold text-display-lg text-balance">{venue.name}</h1>
          <p className="text-muted-foreground">{venue.location}</p>
          <p className="text-lg text-muted-foreground">{venue.description}</p>
        </div>
        <PlaceholderArt label={venue.imageLabel} tone="dusk" ratio="4/3" showCaption />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="course-card">Course Card</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="flex max-w-3xl flex-col gap-4 text-base leading-relaxed">
          {venue.overview.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </TabsContent>

        <TabsContent value="course-card">
          <StatBlock stats={venue.stats} />
        </TabsContent>

        <TabsContent value="history">
          {championshipsHere.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {venue.name} has not yet hosted a recorded championship in our archive.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
              {championshipsHere.map((c) => (
                <li key={c.year} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                  <span className="font-medium">{c.year}</span>
                  <span>{c.winnerName}</span>
                  <span className="text-muted-foreground">{c.margin}</span>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </Container>
  );
}
