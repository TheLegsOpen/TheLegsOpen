"use client";

import { useMemo, useState } from "react";
import { Info, Search, Star, X } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Container } from "@/components/shared/container";
import { ChampionshipSidebar } from "@/components/shared/championship-sidebar";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import { useFavorites } from "@/hooks/use-favorites";
import { cn } from "@/lib/utils";
import type { LeaderboardEntry } from "@/types/player";
import type { Article } from "@/types/article";
import type { SponsorClock } from "@/lib/data/sponsor-clock";

interface LeaderboardViewProps {
  round2: LeaderboardEntry[];
  round4: LeaderboardEntry[];
  featuredArticle: Article;
  clockConfig: SponsorClock;
}

function filterEntries(entries: LeaderboardEntry[], query: string): LeaderboardEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;
  return entries.filter(
    (entry) => entry.player.name.toLowerCase().includes(q) || entry.player.country.toLowerCase().includes(q),
  );
}

export function LeaderboardView({
  round2: LEADERBOARD_ROUND_2,
  round4: LEADERBOARD_ROUND_4,
  featuredArticle,
  clockConfig,
}: LeaderboardViewProps) {
  const { favorites, toggleFavorite, hydrated } = useFavorites();
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);

  const round2Entries = useMemo(() => filterEntries(LEADERBOARD_ROUND_2, query), [LEADERBOARD_ROUND_2, query]);
  const round4Entries = useMemo(() => filterEntries(LEADERBOARD_ROUND_4, query), [LEADERBOARD_ROUND_4, query]);

  return (
    <Tabs defaultValue="round4">
      <div className="bg-primary bg-dashboard-pattern py-4 text-primary-foreground">
        <Container className="flex flex-wrap items-center justify-between gap-4">
          <TabsList className="border border-primary-foreground/15 bg-primary-foreground/10">
            <TabsTrigger
              value="round2"
              className="text-primary-foreground data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-none"
            >
              After Round 2
            </TabsTrigger>
            <TabsTrigger
              value="round4"
              className="text-primary-foreground data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-none"
            >
              Final Round
            </TabsTrigger>
          </TabsList>

          <div className="flex flex-wrap items-center gap-2">
            {searchOpen ? (
              <div className="flex h-10 items-center gap-2 rounded-full border border-primary-foreground/30 bg-primary-foreground/10 px-4">
                <Search className="h-4 w-4 text-primary-foreground/60" aria-hidden="true" />
                <input
                  autoFocus
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Player name or nationality"
                  className="w-48 bg-transparent text-sm text-primary-foreground placeholder:text-primary-foreground/50 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSearchOpen(false);
                    setQuery("");
                  }}
                  aria-label="Close search"
                  className="text-primary-foreground/60 hover:text-accent"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="Search the leaderboard"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-primary-foreground/30 text-primary-foreground transition-colors hover:border-accent hover:text-accent"
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
                  : "border-primary-foreground/30 text-primary-foreground hover:border-accent hover:text-accent",
              )}
            >
              <Star className={cn("h-4 w-4", favoritesOnly && "fill-current")} />
              Favorites only
            </button>

            <button
              type="button"
              onClick={() => setInfoOpen(true)}
              aria-label="Scoring indicators"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-primary-foreground/30 text-primary-foreground transition-colors hover:border-accent hover:text-accent"
            >
              <Info className="h-4 w-4" />
            </button>
          </div>
        </Container>
      </div>

      <div className="bg-surface-dark bg-dashboard-pattern text-surface-dark-foreground">
        <Container className="grid grid-cols-1 gap-10 py-12 sm:py-16 lg:grid-cols-[1fr_320px] lg:items-start">
          <div>
            <TabsContent value="round2" className="mt-0">
              <LeaderboardTable
                entries={round2Entries}
                favorites={hydrated ? favorites : []}
                onToggleFavorite={toggleFavorite}
                favoritesOnly={favoritesOnly}
              />
            </TabsContent>
            <TabsContent value="round4" className="mt-0">
              <LeaderboardTable
                entries={round4Entries}
                favorites={hydrated ? favorites : []}
                onToggleFavorite={toggleFavorite}
                favoritesOnly={favoritesOnly}
              />
            </TabsContent>
          </div>
          <ChampionshipSidebar featuredArticle={featuredArticle} clockConfig={clockConfig} tone="dark" />
        </Container>
      </div>

      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>Scoring indicators</DialogTitle>
          <p className="text-sm text-muted-foreground">What the colours and codes mean.</p>

          <div className="mt-2 flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Colours</p>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 shrink-0 rounded-full bg-destructive" />
                Score is under par
              </div>
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 shrink-0 rounded-full bg-primary" />
                Score is level par
              </div>
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 shrink-0 rounded-full bg-muted-foreground/50" />
                Score is over par
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Codes</p>
            <div className="flex items-center gap-3 text-sm">
              <span className="font-mono font-semibold">(a)</span>
              Amateur
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
