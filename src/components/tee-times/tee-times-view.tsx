"use client";

import { useEffect, useState } from "react";
import { ArrowUpDown } from "lucide-react";

import { Container } from "@/components/shared/container";
import { ChampionshipSidebar } from "@/components/shared/championship-sidebar";
import { MatchupCard } from "@/components/tee-times/matchup-card";
import { PlayerPopup } from "@/components/leaderboard/player-popup";
import { useFavorites } from "@/hooks/use-favorites";
import { cn } from "@/lib/utils";
import { parseTeeTimeMinutes } from "@/lib/data/tee-time-order";
import type { TeeTimeRound } from "@/types/championship";
import type { Article } from "@/types/article";
import type { SponsorClock } from "@/lib/data/sponsor-clock";
import type { CompetitionEntry } from "@/lib/data/scorecards";
import type { StatCategory } from "@/lib/statistics";

const TEE_FILTERS = ["All", "1st", "10th"] as const;

/** Today in the UK, as YYYY-MM-DD -- championships are played there, whoever is reading. */
function ukToday(now: Date): string {
  return now.toLocaleDateString("en-CA", { timeZone: "Europe/London" });
}

/** Minutes past midnight right now in the UK. */
function ukMinutes(now: Date): number {
  const [h, m] = now.toLocaleTimeString("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" }).split(":").map(Number);
  return h * 60 + m;
}

/**
 * The round to open on: whichever is being played today, else the Championship round, else the
 * first. Replaces the accordion, which opened on whatever happened to be listed first.
 */
function defaultRoundIndex(rounds: TeeTimeRound[], now: Date): number {
  const today = ukToday(now);
  const todays = rounds.findIndex((r) => r.isoDate && ukToday(new Date(r.isoDate)) === today);
  if (todays !== -1) return todays;
  const championship = rounds.findIndex((r) => r.round === "Championship");
  return championship !== -1 ? championship : 0;
}

export function TeeTimesView({
  rounds: TEE_TIMES,
  emptyMessage = "Tee times will be published nearer the championship.",
  featuredArticle,
  clockConfig,
  mainEntries,
  stablefordEntries,
  scratchEntries,
  nettCategories,
  scratchCategories,
  streakCategories,
  drivingCategories,
  approachCategories,
  puttingCategories,
}: {
  rounds: TeeTimeRound[];
  /** Shown in place of the tee sheet when no round is published (all archived between championships). */
  emptyMessage?: string;
  featuredArticle: Article;
  clockConfig: SponsorClock;
  mainEntries: CompetitionEntry[];
  stablefordEntries: CompetitionEntry[];
  scratchEntries: CompetitionEntry[];
  nettCategories: StatCategory[];
  scratchCategories: StatCategory[];
  streakCategories: StatCategory[];
  drivingCategories: StatCategory[];
  approachCategories: StatCategory[];
  puttingCategories: StatCategory[];
}) {
  const [teeFilter, setTeeFilter] = useState<(typeof TEE_FILTERS)[number]>("All");
  const [reversed, setReversed] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [roundIndex, setRoundIndex] = useState(() => defaultRoundIndex(TEE_TIMES, new Date()));
  // "Next out" depends on the clock, so it is worked out after hydration (never on the server,
  // whose time would disagree with the reader's page by however long the page was cached) and
  // re-checked every minute.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);
  const { favorites, hydrated, toggleFavorite } = useFavorites();

  const selectedMain = mainEntries.find((e) => e.player.id === selectedPlayerId);
  const selectedStableford = stablefordEntries.find((e) => e.player.id === selectedPlayerId);
  const selectedScratch = scratchEntries.find((e) => e.player.id === selectedPlayerId);
  const leaderToPar = mainEntries[0]?.toPar ?? 0;

  const distinctTees = new Set(TEE_TIMES.flatMap((round) => round.groups.map((group) => group.tee)));
  const showTeeFilter = distinctTees.size > 1;

  return (
    <>
      <div className="bg-surface-dark text-surface-dark-foreground">
        <Container className="grid grid-cols-1 gap-x-5 gap-y-10 py-12 sm:py-16 lg:grid-cols-main-side lg:items-start">
          {TEE_TIMES.length === 0 ? (
            <div className="flex min-h-[240px] items-center justify-center border border-surface-dark-foreground/15 px-8 py-16 text-center">
              <p className="max-w-md font-menu text-[20px] leading-7 text-surface-dark-foreground/80">{emptyMessage}</p>
            </div>
          ) : (
          <div>
            <div className={cn("mb-8 flex flex-wrap items-center gap-4", showTeeFilter ? "justify-between" : "justify-end")}>
              {showTeeFilter && (
                <div role="tablist" aria-label="Filter by starting tee" className="flex flex-wrap gap-2">
                  {TEE_FILTERS.map((filter) => (
                    <button
                      key={filter}
                      role="tab"
                      type="button"
                      aria-selected={teeFilter === filter}
                      onClick={() => setTeeFilter(filter)}
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                        teeFilter === filter
                          ? "border-accent bg-accent text-accent-foreground"
                          : "border-surface-dark-foreground/30 text-surface-dark-foreground hover:border-accent hover:text-accent",
                      )}
                    >
                      {filter === "All" ? "All groups" : `${filter} tee`}
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => setReversed((prev) => !prev)}
                aria-pressed={reversed}
                className="flex h-10 items-center gap-2 rounded-full border border-surface-dark-foreground/30 px-4 text-sm font-medium text-surface-dark-foreground transition-colors hover:border-accent hover:text-accent"
              >
                <ArrowUpDown className="h-4 w-4" />
                Reverse order
              </button>
            </div>

            {(() => {
              const round = TEE_TIMES[Math.min(roundIndex, TEE_TIMES.length - 1)];
              const groups = round.groups.filter((group) => teeFilter === "All" || group.tee === teeFilter);
              const ordered = reversed ? [...groups].reverse() : groups;
              // On the round's own day only: the first group whose tee time is still to come.
              const isToday = Boolean(now && round.isoDate && ukToday(new Date(round.isoDate)) === ukToday(now));
              const nextOutIndex = isToday && now ? ordered.findIndex((g) => parseTeeTimeMinutes(g.time) >= ukMinutes(now)) : -1;
              return (
                <div className="flex flex-col gap-5">
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-3">
                    {TEE_TIMES.length > 1 ? (
                      <div role="tablist" aria-label="Round" className="inline-flex gap-1 rounded-full border border-surface-dark-foreground/15 bg-surface-dark-foreground/10 p-1">
                        {TEE_TIMES.map((r, index) => (
                          <button
                            key={index}
                            type="button"
                            role="tab"
                            aria-selected={index === roundIndex}
                            onClick={() => setRoundIndex(index)}
                            className={cn(
                              "rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors",
                              index === roundIndex ? "bg-accent text-accent-foreground" : "text-surface-dark-foreground/70 hover:text-surface-dark-foreground",
                            )}
                          >
                            {r.round}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <span>
                      <span className="text-sm font-semibold uppercase tracking-wide text-surface-dark-foreground/60">{round.round} Round</span>
                      <span className="ml-2 font-display text-xl font-bold">{round.date}</span>
                    </span>
                  </div>
                  {ordered.length === 0 ? (
                    <p className="py-4 text-sm text-surface-dark-foreground/60">No groups off the {teeFilter} for this round.</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {ordered.map((group, index) => (
                        <div key={index} className="flex flex-col gap-2">
                          {index === nextOutIndex ? (
                            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-accent">
                              Next out <span aria-hidden="true">↓</span>
                            </p>
                          ) : null}
                          <MatchupCard
                            gameNumber={reversed ? ordered.length - index : index + 1}
                            group={group}
                            favorites={hydrated ? favorites : []}
                            mainEntries={mainEntries}
                            roundType={round.round}
                            onSelectPlayer={setSelectedPlayerId}
                            onToggleFavorite={toggleFavorite}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
          )}

          <ChampionshipSidebar featuredArticle={featuredArticle} clockConfig={clockConfig} tone="dark" sticky />
        </Container>
      </div>

      <PlayerPopup
        main={selectedMain}
        stableford={selectedStableford}
        scratch={selectedScratch}
        nettCategories={nettCategories}
        scratchCategories={scratchCategories}
        streakCategories={streakCategories}
        drivingCategories={drivingCategories}
        approachCategories={approachCategories}
        puttingCategories={puttingCategories}
        initialCompetition="main"
        leaderToPar={leaderToPar}
        isFav={selectedPlayerId ? favorites.includes(selectedPlayerId) : false}
        onToggleFavorite={() => selectedPlayerId && toggleFavorite(selectedPlayerId)}
        open={!!selectedMain}
        onOpenChange={(next) => {
          if (!next) setSelectedPlayerId(null);
        }}
      />
    </>
  );
}
