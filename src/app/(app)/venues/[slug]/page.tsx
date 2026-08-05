import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHero } from "@/components/shared/page-hero";
import { Container } from "@/components/shared/container";
import { CountryFlag } from "@/components/shared/country-flag";
import { StatBlock } from "@/components/venues/stat-block";
import { VenueGallery } from "@/components/venues/venue-gallery";
import { VenueChampions, type VenueChampion } from "@/components/venues/venue-champions";
import { ArticleCard } from "@/components/news/article-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAllVenueSlugs, getVenueBySlug } from "@/lib/data/venues";
import { getChampionshipsByVenueSlug } from "@/lib/data/championships";
import { getPlayers } from "@/lib/data/players";
import { getArticles } from "@/lib/data/articles";

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

  const [championshipsRaw, players, allArticles] = await Promise.all([
    getChampionshipsByVenueSlug(venue.slug),
    getPlayers(),
    getArticles(),
  ]);
  const championshipsHere = [...championshipsRaw].sort((a, b) => b.year - a.year);

  const playerByName = new Map(players.map((player) => [player.name, player]));
  const championsByKey = new Map<string, VenueChampion>();
  for (const c of championshipsHere) {
    if (!c.winnerName) continue;
    const key = c.winnerPlayerSlug ?? c.winnerName;
    const existing = championsByKey.get(key);
    if (existing) {
      existing.years.push(c.year);
      existing.years.sort((a, b) => a - b);
    } else {
      championsByKey.set(key, {
        key,
        name: c.winnerName,
        slug: c.winnerPlayerSlug,
        photoUrl: playerByName.get(c.winnerName)?.photoUrl,
        years: [c.year],
      });
    }
  }
  const champions = Array.from(championsByKey.values()).sort((a, b) => Math.max(...b.years) - Math.max(...a.years));

  const featuredArticleSlugs = venue.featuredArticleSlugs ?? [];
  const featuredArticles =
    featuredArticleSlugs.length > 0
      ? featuredArticleSlugs.map((articleSlug) => allArticles.find((a) => a.slug === articleSlug)).filter((a) => Boolean(a))
      : [];

  return (
    <>
      <PageHero
        variant="photo"
        heightPx={450}
        imageLabel={venue.imageLabel}
        imageUrl={venue.imageUrl}
        eyebrow={venue.region}
        title={venue.name}
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Venues", href: "/venues" }, { label: venue.name }]}
      />

      <Container className="flex flex-col gap-16 py-10 sm:py-14">
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-2 text-muted-foreground">
            {venue.countryCode ? <CountryFlag code={venue.countryCode} className="h-3 w-[18px] shrink-0" /> : null}
            <span>{[venue.location, venue.region, venue.country].filter(Boolean).join(", ")}</span>
          </p>
          <p className="max-w-3xl text-lg text-muted-foreground">{venue.description}</p>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="course-card">Course Card</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="flex max-w-3xl flex-col gap-4 text-base leading-relaxed">
            {venue.overview.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </TabsContent>

          <TabsContent value="course-card">
            <StatBlock stats={venue.stats} />
          </TabsContent>
        </Tabs>

        {venue.gallery && venue.gallery.length > 0 ? <VenueGallery venueName={venue.name} photos={venue.gallery} /> : null}

        {featuredArticles.length > 0 ? (
          <div className="flex flex-col gap-6">
            <h2 className="font-display font-bold text-2xl">Featured Articles</h2>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
              {featuredArticles.map((article) => (
                <ArticleCard key={article!.slug} article={article!} />
              ))}
            </div>
          </div>
        ) : null}

        {championshipsHere.length > 0 ? (
          <div className="flex flex-col gap-6">
            <h2 className="font-display font-bold text-2xl">The Legs Open at {venue.name}</h2>
            <ul className="flex flex-col divide-y divide-border border-y border-border">
              {championshipsHere.map((c) => (
                <li key={c.year} className="flex items-center justify-between gap-4 py-4">
                  <span className="w-16 shrink-0 font-display text-2xl font-bold text-muted-foreground">{c.year}</span>
                  {c.winnerName ? (
                    c.winnerPlayerSlug ? (
                      <Link
                        href={`/players/${c.winnerPlayerSlug}`}
                        className="flex-1 font-display text-xl font-bold uppercase tracking-wide hover:text-accent hover:underline"
                      >
                        {c.winnerName}
                      </Link>
                    ) : (
                      <span className="flex-1 font-display text-xl font-bold uppercase tracking-wide">{c.winnerName}</span>
                    )
                  ) : (
                    <span className="flex-1 text-muted-foreground">TBD</span>
                  )}
                  <span className="shrink-0 text-sm text-muted-foreground">{c.margin ?? "—"}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{venue.name} has not yet hosted a recorded championship in our archive.</p>
        )}

        <VenueChampions venueName={venue.name} champions={champions} />
      </Container>
    </>
  );
}
