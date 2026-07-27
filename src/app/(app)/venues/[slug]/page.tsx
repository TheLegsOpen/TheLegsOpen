import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/shared/container";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PlaceholderArt } from "@/components/shared/placeholder-art";
import { CountryFlag } from "@/components/shared/country-flag";
import { StatBlock } from "@/components/venues/stat-block";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAllVenueSlugs, getVenueBySlug } from "@/lib/data/venues";
import { getChampionshipsByVenueSlug } from "@/lib/data/championships";

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

  const championshipsHere = await getChampionshipsByVenueSlug(venue.slug);

  return (
    <Container className="flex flex-col gap-10 py-10 sm:py-14">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Venues", href: "/venues" }, { label: venue.name }]} />

      <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
        <div className="flex flex-col gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{venue.region}</span>
          <h1 className="font-display font-bold text-display-lg text-balance">{venue.name}</h1>
          <p className="flex items-center gap-2 text-muted-foreground">
            {venue.countryCode ? <CountryFlag code={venue.countryCode} className="h-3 w-[18px] shrink-0" /> : null}
            <span>{[venue.location, venue.region, venue.country].filter(Boolean).join(", ")}</span>
          </p>
          <p className="text-lg text-muted-foreground">{venue.description}</p>
        </div>
        <div className="relative">
          <PlaceholderArt label={venue.imageLabel} imageUrl={venue.imageUrl} tone="dusk" ratio="4/3" showCaption />
          {venue.countryCode ? (
            <span className="absolute right-2 top-2 flex items-center gap-1 rounded bg-black/60 px-1.5 py-1 text-white">
              <CountryFlag code={venue.countryCode} className="h-2.5 w-4" />
            </span>
          ) : null}
        </div>
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
                  <span>{c.winnerName ?? "TBD"}</span>
                  <span className="text-muted-foreground">{c.margin ?? "—"}</span>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </Container>
  );
}
