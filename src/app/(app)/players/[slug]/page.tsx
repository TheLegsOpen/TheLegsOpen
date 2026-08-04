import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Trophy } from "lucide-react";

import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { Container } from "@/components/shared/container";
import { PlaceholderArt } from "@/components/shared/placeholder-art";
import { CountryFlag } from "@/components/shared/country-flag";
import { ArticleCard } from "@/components/news/article-card";
import { PlayerGallery } from "@/components/players/player-gallery";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAllPlayerSlugs, getPlayerBySlug, getPlayerPerformances } from "@/lib/data/players";
import { getCompetitionLeaderboard } from "@/lib/data/scorecards";
import { getTeeTimes } from "@/lib/data/tee-times";
import { getArticles } from "@/lib/data/articles";
import { getSiteTheme } from "@/lib/data/site-theme";
import { getPageBanners } from "@/lib/data/page-banners";
import { formatToPar } from "@/lib/leaderboard";
import { cn } from "@/lib/utils";
import type { Article } from "@/types/article";

interface PlayerPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = await getAllPlayerSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PlayerPageProps): Promise<Metadata> {
  const { slug } = await params;
  const player = await getPlayerBySlug(slug);
  if (!player) return {};
  return {
    title: player.name,
    description: `${player.name} player profile — stats, bio and championship history for The Legs Open.`,
  };
}

function StatCell({ label, value, first = false }: { label: string; value: string | number; first?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-1", !first && "border-l border-primary-foreground/20 pl-6 sm:pl-10")}>
      <span className="text-xs uppercase tracking-wide text-primary-foreground/60">{label}</span>
      <span className="font-display text-2xl font-bold sm:text-3xl">{value}</span>
    </div>
  );
}

export default async function PlayerPage({ params }: PlayerPageProps) {
  const { slug } = await params;
  const player = await getPlayerBySlug(slug);
  if (!player) notFound();

  const [mainLeaderboard, teeTimeRounds, performances, allArticles, theme, banners] = await Promise.all([
    getCompetitionLeaderboard("main"),
    getTeeTimes(),
    getPlayerPerformances(player),
    getArticles(),
    getSiteTheme(),
    getPageBanners(),
  ]);

  const entry = mainLeaderboard.find((e) => e.player.id === player.id);
  const winYears = performances.filter((p) => p.finish === "Winner").map((p) => p.year);
  const debutYear = performances.length > 0 ? Math.min(...performances.map((p) => p.year)) : player.debutYear;
  const bestFinish = performances.length > 0 ? performances.reduce((best, p) => (p.position < best.position ? p : best)).finish : undefined;

  const teeTimes = teeTimeRounds.flatMap((round) =>
    round.groups
      .filter((group) => group.players.some((p) => p.id === player.id))
      .map((group) => ({ round: round.round, date: round.date, time: group.time, tee: group.tee })),
  );

  const featuredArticleSlugs = player.featuredArticleSlugs ?? [];
  const featuredArticles: Article[] =
    featuredArticleSlugs.length > 0
      ? featuredArticleSlugs.map((articleSlug) => allArticles.find((a) => a.slug === articleSlug)).filter((a): a is Article => Boolean(a))
      : allArticles.slice(0, 3);

  const stats: { label: string; value: string | number }[] = [
    { label: "Age", value: player.age ?? "—" },
    ...(player.turnedPro ? [{ label: "Turned Pro", value: player.turnedPro }] : []),
    ...(debutYear ? [{ label: "Legs Open Debut", value: debutYear }] : []),
    { label: "Championship Handicap", value: player.championshipHandicap ?? "—" },
    { label: "Previous Opens", value: player.previousOpens },
    ...(bestFinish ? [{ label: "Best Legs Open Finish", value: bestFinish }] : []),
  ];

  const [firstName, ...rest] = player.name.split(" ");
  const surname = rest.join(" ");

  return (
    <>
      <section className="relative w-full overflow-hidden text-primary-foreground">
        <PlaceholderArt label={`${player.name} at Seabrook Old Course`} imageUrl={banners.playerProfileUrl} tone="navy" fill />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.95)_0%,rgba(0,0,0,0.8)_45%,rgba(0,0,0,0.25)_75%,rgba(0,0,0,0.05)_100%)]" />

        {/* min-height, not PageHero's fixed h-[60vh] -- this hero carries a stat grid + portrait rather than just title/description, so it needs to grow with content instead of cropping it. Still keyed to the same 60vh used by other "large" PageHero pages (venues, club) for visual consistency. */}
        <Container className="relative z-10 flex min-h-[60vh] flex-col justify-end gap-8 py-10 sm:py-14">
          <Breadcrumbs
            items={[{ label: "Home", href: "/" }, { label: "Leaderboard", href: "/leaderboard" }, { label: player.name }]}
          />
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{banners.playerProfileEyebrow}</span>
          {winYears.length > 0 ? (
            <div className="flex w-fit items-center gap-3 border-l-4 border-accent bg-primary-foreground/5 py-2 pl-4 pr-6">
              {theme.championBadgeUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={theme.championBadgeUrl} alt="" aria-hidden="true" className="h-6 w-6 shrink-0 object-contain" />
              ) : (
                <Trophy className="h-6 w-6 shrink-0 text-accent" aria-hidden="true" />
              )}
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Champion Golfer of the Year</p>
                <p className="font-display text-2xl font-bold text-white sm:text-3xl">{winYears.join(" & ")}</p>
              </div>
            </div>
          ) : null}
          <div className="grid gap-8 lg:grid-cols-[1fr_320px] lg:items-center">
            <div className="flex flex-wrap gap-x-6 gap-y-4 sm:gap-x-10">
              {stats.map((stat, index) => (
                <StatCell key={stat.label} label={stat.label} value={stat.value} first={index === 0} />
              ))}
            </div>
            <PlaceholderArt
              label={`${player.name} portrait`}
              imageUrl={player.photoUrl}
              tone="slate"
              ratio="4/3"
              fade
              className="lg:justify-self-end"
            />
          </div>
        </Container>
      </section>

      <section className="border-b border-border">
        <Container className="flex flex-col gap-2 py-8">
          <p className="font-display text-2xl">{firstName}</p>
          <h1 className="-mt-3 font-display font-bold text-display-xl">{surname.toUpperCase()}</h1>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CountryFlag code={player.countryCode} className="h-3 w-4" />
            {player.country}
          </p>
        </Container>
      </section>

      <Container className="py-10 sm:py-14">
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="bio">Bio</TabsTrigger>
            <TabsTrigger value="performances">Performances</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="flex flex-col gap-10 pt-8">
            {entry ? (
              <div>
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  This championship
                </p>
                <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                  {[
                    { label: "Position", value: `${entry.tied ? "T" : ""}${entry.position}` },
                    { label: "To Par", value: entry.toPar !== undefined ? formatToPar(entry.toPar) : "—" },
                    { label: "Score", value: entry.score ?? "—" },
                    { label: "Thru", value: entry.thru },
                  ].map((stat) => (
                    <div key={stat.label} className="flex flex-col gap-1 border border-border p-4">
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</dt>
                      <dd className="font-display text-2xl font-bold">{stat.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : (
              <p className="text-muted-foreground">{player.name} is not currently in the field for this championship.</p>
            )}

            {teeTimes.length > 0 ? (
              <div>
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Tee times</p>
                <ul className="flex flex-col divide-y divide-border border-y border-border">
                  {teeTimes.map((t, index) => (
                    <li key={index} className="flex items-center justify-between px-1 py-3 text-sm">
                      <span className="font-medium">
                        {t.round} Round · {t.date}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {t.time} · {t.tee} tee
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="bio" className="flex flex-col gap-10 pt-8">
            <div className="flex max-w-2xl flex-col gap-4 text-base leading-relaxed text-muted-foreground">
              {player.bio.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
            <PlayerGallery playerName={firstName} photos={player.gallery ?? []} />
          </TabsContent>

          <TabsContent value="performances" className="pt-8">
            {performances.length === 0 ? (
              <p className="text-muted-foreground">No previous appearances at the Legs Open on record.</p>
            ) : (
              <div className="overflow-x-auto border border-border">
                <table className="w-full min-w-[420px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3">Year</th>
                      <th className="px-4 py-3">Venue</th>
                      <th className="px-4 py-3 text-right">Finish</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performances.map((result) => (
                      <tr key={result.year} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 font-medium tabular-nums">{result.year}</td>
                        <td className="px-4 py-3">{result.venueName}</td>
                        <td
                          className={cn(
                            "px-4 py-3 text-right font-medium",
                            result.finish === "Winner" && "text-accent",
                          )}
                        >
                          {result.finish}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Container>

      {featuredArticles.length > 0 ? (
        <section className="border-t border-border bg-secondary/40">
          <Container className="flex flex-col gap-8 py-16 sm:py-24">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-display font-bold text-2xl">More on {firstName}</h2>
              <Link href="/latest" className="text-sm font-bold uppercase tracking-wide text-primary hover:underline">
                See more
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
              {featuredArticles.map((article) => (
                <ArticleCard key={article.slug} article={article} />
              ))}
            </div>
          </Container>
        </section>
      ) : null}
    </>
  );
}
