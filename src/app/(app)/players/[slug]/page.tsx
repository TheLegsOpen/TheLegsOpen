import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { Container } from "@/components/shared/container";
import { PlaceholderArt } from "@/components/shared/placeholder-art";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAllPlayerSlugs, getPlayerBySlug } from "@/lib/data/players";
import { getLeaderboard } from "@/lib/data/leaderboard";
import { getTeeTimes } from "@/lib/data/tee-times";
import { getChampionshipHistory } from "@/lib/data/championships";
import { formatToPar, synthesizePastResults } from "@/lib/leaderboard";
import { cn } from "@/lib/utils";

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

  const [round4, teeTimeRounds, championshipHistory] = await Promise.all([
    getLeaderboard("round4"),
    getTeeTimes(),
    getChampionshipHistory(),
  ]);
  const entry = round4.find((e) => e.player.id === player.id);
  const pastResults = synthesizePastResults(player, championshipHistory);
  const teeTimes = teeTimeRounds.flatMap((round) =>
    round.groups
      .filter((group) => group.players.some((p) => p.id === player.id))
      .map((group) => ({ round: round.round, day: round.day, time: group.time, tee: group.tee })),
  );

  const [firstName, ...rest] = player.name.split(" ");
  const surname = rest.join(" ");

  return (
    <>
      <section className="bg-primary text-primary-foreground">
        <Container className="flex flex-col gap-8 py-10 sm:py-14">
          <Breadcrumbs
            items={[{ label: "Home", href: "/" }, { label: "Leaderboard", href: "/leaderboard" }, { label: player.name }]}
          />
          <div className="grid gap-8 lg:grid-cols-[1fr_320px] lg:items-center">
            <div className="flex gap-6 sm:gap-10">
              <StatCell label="Age" value={player.age} first />
              <StatCell label="Turned Pro" value={player.turnedPro ?? "Amateur"} />
              <StatCell label="Previous Opens" value={player.previousOpens} />
            </div>
            <PlaceholderArt
              label={`${player.name} portrait`}
              tone="slate"
              ratio="4/3"
              className="lg:justify-self-end"
            />
          </div>
        </Container>
      </section>

      <section className="border-b border-border">
        <Container className="flex flex-col gap-2 py-8">
          <p className="font-display text-2xl">{firstName}</p>
          <h1 className="-mt-3 font-display font-bold text-display-xl">{surname.toUpperCase()}</h1>
          <p className="text-sm text-muted-foreground">
            {player.country}
            {player.isAmateur ? " · Amateur" : ""}
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
                    { label: "To Par", value: formatToPar(entry.scoreToPar) },
                    { label: "Total", value: entry.total },
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
                  {teeTimes.map((t) => (
                    <li key={t.round} className="flex items-center justify-between px-1 py-3 text-sm">
                      <span className="font-medium">
                        Round {t.round} · {t.day}
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

          <TabsContent value="bio" className="pt-8">
            <div className="flex max-w-2xl flex-col gap-4 text-base leading-relaxed text-muted-foreground">
              {player.bio.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="performances" className="pt-8">
            {pastResults.length === 0 ? (
              <p className="text-muted-foreground">No previous appearances at the Legs Open.</p>
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
                    {pastResults.map((result) => (
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
    </>
  );
}
