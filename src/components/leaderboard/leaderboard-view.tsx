"use client";

import { useMemo, useState } from "react";
import { Flag, Info, Search, Star, X } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Container } from "@/components/shared/container";
import { ChampionshipSidebar } from "@/components/shared/championship-sidebar";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import { HoleByHoleTable } from "@/components/leaderboard/hole-by-hole-table";
import { PlayerPopup } from "@/components/leaderboard/player-popup";
import { useFavorites } from "@/hooks/use-favorites";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";
import { cn } from "@/lib/utils";
import type { CompetitionEntry, Competition } from "@/lib/data/scorecards";
import type { Article } from "@/types/article";
import type { SponsorClock } from "@/lib/data/sponsor-clock";
import type { StatCategory } from "@/lib/statistics";

interface LeaderboardViewProps {
  main: CompetitionEntry[];
  stableford: CompetitionEntry[];
  scratch: CompetitionEntry[];
  featuredArticle: Article;
  clockConfig: SponsorClock;
  nettCategories: StatCategory[];
  scratchCategories: StatCategory[];
  streakCategories: StatCategory[];
  drivingCategories: StatCategory[];
  approachCategories: StatCategory[];
  puttingCategories: StatCategory[];
}

/** Matches the ~10s live-score polling cadence measured on theopen.com/leaderboard. */
const AUTO_REFRESH_INTERVAL_MS = 10_000;

function filterEntries(entries: CompetitionEntry[], query: string): CompetitionEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;
  return entries.filter(
    (entry) => entry.player.name.toLowerCase().includes(q) || entry.player.country.toLowerCase().includes(q),
  );
}

export function LeaderboardView({
  main,
  stableford,
  scratch,
  featuredArticle,
  clockConfig,
  nettCategories,
  scratchCategories,
  streakCategories,
  drivingCategories,
  approachCategories,
  puttingCategories,
}: LeaderboardViewProps) {
  const { favorites, toggleFavorite, hydrated } = useFavorites();
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);
  const [holeByHole, setHoleByHole] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [popupCompetition, setPopupCompetition] = useState<Competition>("main");

  function selectPlayer(playerId: string, competition: Competition) {
    setSelectedPlayerId(playerId);
    setPopupCompetition(competition);
  }

  useAutoRefresh(AUTO_REFRESH_INTERVAL_MS);

  const mainEntries = useMemo(() => filterEntries(main, query), [main, query]);
  const stablefordEntries = useMemo(() => filterEntries(stableford, query), [stableford, query]);
  const scratchEntries = useMemo(() => filterEntries(scratch, query), [scratch, query]);

  const selectedMain = main.find((e) => e.player.id === selectedPlayerId);
  const selectedStableford = stableford.find((e) => e.player.id === selectedPlayerId);
  const selectedScratch = scratch.find((e) => e.player.id === selectedPlayerId);
  const leaderToPar = main[0]?.toPar ?? 0;

  return (
    <Tabs defaultValue="main">
      <div className="bg-primary text-surface-dark-foreground">
        <Container className="py-12 sm:py-16">
          <div
            className={cn(
              "grid grid-cols-1 gap-10 lg:items-start",
              holeByHole ? "lg:grid-cols-1" : "lg:grid-cols-[1fr_320px]",
            )}
          >
            <div>
              <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                <TabsList className="border border-surface-dark-foreground/15 bg-surface-dark-foreground/10">
                  <TabsTrigger
                    value="main"
                    className="text-surface-dark-foreground data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-none"
                  >
                    Main
                  </TabsTrigger>
                  <TabsTrigger
                    value="stableford"
                    className="text-surface-dark-foreground data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-none"
                  >
                    Stableford
                  </TabsTrigger>
                  <TabsTrigger
                    value="scratch"
                    className="text-surface-dark-foreground data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-none"
                  >
                    Scratch
                  </TabsTrigger>
                </TabsList>

                <div className="flex flex-wrap items-center gap-2">
                  {searchOpen ? (
                    <div className="flex h-10 items-center gap-2 rounded-full border border-surface-dark-foreground/30 bg-surface-dark-foreground/10 px-4">
                      <Search className="h-4 w-4 text-surface-dark-foreground/60" aria-hidden="true" />
                      <input
                        autoFocus
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Player name or nationality"
                        className="w-48 bg-transparent text-sm text-surface-dark-foreground placeholder:text-surface-dark-foreground/50 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSearchOpen(false);
                          setQuery("");
                        }}
                        aria-label="Close search"
                        className="text-surface-dark-foreground/60 hover:text-accent"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSearchOpen(true)}
                      aria-label="Search the leaderboard"
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-dark-foreground/30 text-surface-dark-foreground transition-colors hover:border-accent hover:text-accent"
                    >
                      <Search className="h-4 w-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setFavoritesOnly((prev) => !prev)}
                    aria-pressed={favoritesOnly}
                    className={cn(
                      "flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
                      favoritesOnly
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-surface-dark-foreground/30 text-surface-dark-foreground hover:border-accent hover:text-accent",
                    )}
                  >
                    <Star className={cn("h-4 w-4", favoritesOnly && "fill-current")} />
                    Favorites only
                  </button>

                  <button
                    type="button"
                    onClick={() => setInfoOpen(true)}
                    aria-label="Scoring indicators"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-dark-foreground/30 text-surface-dark-foreground transition-colors hover:border-accent hover:text-accent"
                  >
                    <Info className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setHoleByHole((prev) => !prev)}
                    aria-pressed={holeByHole}
                    className={cn(
                      "flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
                      holeByHole
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-surface-dark-foreground/30 text-surface-dark-foreground hover:border-accent hover:text-accent",
                    )}
                  >
                    <Flag className="h-4 w-4" />
                    Hole by hole
                  </button>
                </div>
              </div>

              <TabsContent value="main" className="mt-0">
                {holeByHole ? (
                  <HoleByHoleTable entries={mainEntries} onSelectPlayer={(id) => selectPlayer(id, "main")} />
                ) : (
                  <LeaderboardTable
                    entries={mainEntries}
                    competition="main"
                    favorites={hydrated ? favorites : []}
                    onToggleFavorite={toggleFavorite}
                    favoritesOnly={favoritesOnly}
                    onSelectPlayer={(id) => selectPlayer(id, "main")}
                  />
                )}
              </TabsContent>
              <TabsContent value="stableford" className="mt-0">
                {holeByHole ? (
                  <HoleByHoleTable entries={stablefordEntries} onSelectPlayer={(id) => selectPlayer(id, "stableford")} />
                ) : (
                  <LeaderboardTable
                    entries={stablefordEntries}
                    competition="stableford"
                    favorites={hydrated ? favorites : []}
                    onToggleFavorite={toggleFavorite}
                    favoritesOnly={favoritesOnly}
                    onSelectPlayer={(id) => selectPlayer(id, "stableford")}
                  />
                )}
              </TabsContent>
              <TabsContent value="scratch" className="mt-0">
                {holeByHole ? (
                  <HoleByHoleTable entries={scratchEntries} onSelectPlayer={(id) => selectPlayer(id, "scratch")} />
                ) : (
                  <LeaderboardTable
                    entries={scratchEntries}
                    competition="scratch"
                    favorites={hydrated ? favorites : []}
                    onToggleFavorite={toggleFavorite}
                    favoritesOnly={favoritesOnly}
                    onSelectPlayer={(id) => selectPlayer(id, "scratch")}
                  />
                )}
              </TabsContent>
            </div>
            {!holeByHole && <ChampionshipSidebar featuredArticle={featuredArticle} clockConfig={clockConfig} tone="dark" />}
          </div>
        </Container>
      </div>

      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>Scoring indicators</DialogTitle>
          <p className="text-sm text-muted-foreground">What the colours mean on the Main and Scratch leaderboards.</p>

          <div className="mt-2 flex flex-col gap-3">
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: "#910149" }} />
                Eagle or better (Hole by hole only)
              </div>
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: "#CB333B" }} />
                Under par / Birdie
              </div>
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: "#758973" }} />
                Level par
              </div>
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: "#08325A" }} />
                Over par / Bogey or worse
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Stableford points aren&apos;t shown relative to par, so this doesn&apos;t apply on that tab.
          </p>
        </DialogContent>
      </Dialog>

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
        initialCompetition={popupCompetition}
        leaderToPar={leaderToPar}
        isFav={selectedPlayerId ? favorites.includes(selectedPlayerId) : false}
        onToggleFavorite={() => selectedPlayerId && toggleFavorite(selectedPlayerId)}
        open={!!selectedMain}
        onOpenChange={(next) => {
          if (!next) setSelectedPlayerId(null);
        }}
      />
    </Tabs>
  );
}
