"use client";

import { useState } from "react";
import { ArrowUpDown } from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Container } from "@/components/shared/container";
import { ChampionshipSidebar } from "@/components/shared/championship-sidebar";
import { MatchupCard } from "@/components/tee-times/matchup-card";
import { PlayerPopup } from "@/components/leaderboard/player-popup";
import { useFavorites } from "@/hooks/use-favorites";
import { cn } from "@/lib/utils";
import type { TeeTimeRound } from "@/types/championship";
import type { Article } from "@/types/article";
import type { SponsorClock } from "@/lib/data/sponsor-clock";
import type { CompetitionEntry } from "@/lib/data/scorecards";
import type { StatCategory } from "@/lib/statistics";

const TEE_FILTERS = ["All", "1st", "10th"] as const;

export function TeeTimesView({
  rounds: TEE_TIMES,
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
        <Container className="grid grid-cols-1 gap-10 py-12 sm:py-16 lg:grid-cols-[1fr_320px] lg:items-start">
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

            <Accordion type="single" collapsible defaultValue="round-0" className="flex flex-col">
            {TEE_TIMES.map((round, roundIndex) => {
              const groups = round.groups.filter((group) => teeFilter === "All" || group.tee === teeFilter);
              const ordered = reversed ? [...groups].reverse() : groups;
              return (
                <AccordionItem key={roundIndex} value={`round-${roundIndex}`} className="border-b border-surface-dark-foreground/15">
                  <AccordionTrigger className="font-display font-bold text-xl hover:text-accent">
                    {round.round} Round · {round.date}
                  </AccordionTrigger>
                  <AccordionContent>
                    {ordered.length === 0 ? (
                      <p className="py-4 text-sm text-surface-dark-foreground/60">No groups off the {teeFilter} for this round.</p>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {ordered.map((group, index) => (
                          <MatchupCard
                            key={index}
                            gameNumber={reversed ? ordered.length - index : index + 1}
                            group={group}
                            favorites={hydrated ? favorites : []}
                            mainEntries={mainEntries}
                            tone="dark"
                            onSelectPlayer={setSelectedPlayerId}
                          />
                        ))}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
            </Accordion>
          </div>

          <ChampionshipSidebar featuredArticle={featuredArticle} clockConfig={clockConfig} tone="dark" />
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
