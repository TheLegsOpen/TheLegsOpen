"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { PlayerStatPanel } from "@/components/leaderboard/player-stat-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { StatCategory } from "@/lib/statistics";

type Mode = "career" | "year";

export interface SixCategories {
  nettCategories: StatCategory[];
  scratchCategories: StatCategory[];
  streakCategories: StatCategory[];
  drivingCategories: StatCategory[];
  approachCategories: StatCategory[];
  puttingCategories: StatCategory[];
}

interface StatsTabProps {
  playerId: string;
  careerCategories: SixCategories;
  years: { year: number; championshipId: string }[];
}

export function StatsTab({ playerId, careerCategories, years }: StatsTabProps) {
  const [mode, setMode] = useState<Mode>("career");
  const [selectedChampionshipId, setSelectedChampionshipId] = useState<string | undefined>(undefined);
  const [cache, setCache] = useState<Record<string, SixCategories>>({});

  async function loadYear(championshipId: string) {
    if (cache[championshipId]) return;
    const res = await fetch(`/api/players/year-stats?championshipId=${championshipId}`);
    if (!res.ok) return;
    const data = (await res.json()) as SixCategories;
    setCache((prev) => ({ ...prev, [championshipId]: data }));
  }

  function selectYearMode() {
    setMode("year");
    // years is newest-first, so the most recent year this player has stats for is the sane default.
    const championshipId = selectedChampionshipId ?? years[0]?.championshipId;
    setSelectedChampionshipId(championshipId);
    if (championshipId) void loadYear(championshipId);
  }

  function selectChampionship(championshipId: string) {
    setSelectedChampionshipId(championshipId);
    void loadYear(championshipId);
  }

  const active = mode === "career" ? careerCategories : selectedChampionshipId ? cache[selectedChampionshipId] : undefined;
  const isLoading = mode === "year" && !active;

  return (
    <div className="flex flex-col gap-6 bg-surface-dark p-6 text-surface-dark-foreground">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode("career")}
            className={cn(
              "rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors",
              mode === "career"
                ? "border-accent bg-accent text-accent-foreground"
                : "border-surface-dark-foreground/30 text-surface-dark-foreground hover:border-accent hover:text-accent",
            )}
          >
            Career
          </button>
          <button
            type="button"
            onClick={selectYearMode}
            disabled={years.length === 0}
            className={cn(
              "rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors",
              mode === "year"
                ? "border-accent bg-accent text-accent-foreground"
                : "border-surface-dark-foreground/30 text-surface-dark-foreground hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-surface-dark-foreground/30 disabled:hover:text-surface-dark-foreground",
            )}
          >
            Year
          </button>
        </div>

        {mode === "year" ? (
          <label className="relative inline-flex w-fit items-center gap-2 rounded-full border border-surface-dark-foreground/30 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-surface-dark-foreground">
            <span className="sr-only">Select year</span>
            <select
              value={selectedChampionshipId}
              onChange={(e) => selectChampionship(e.target.value)}
              className="cursor-pointer appearance-none bg-transparent pr-5 text-surface-dark-foreground focus:outline-none [&>option]:text-foreground"
            >
              {years.map((y) => (
                <option key={y.championshipId} value={y.championshipId}>
                  {y.year}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 h-4 w-4" />
          </label>
        ) : null}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : active ? (
        <PlayerStatPanel
          playerId={playerId}
          nettCategories={active.nettCategories}
          scratchCategories={active.scratchCategories}
          streakCategories={active.streakCategories}
          drivingCategories={active.drivingCategories}
          approachCategories={active.approachCategories}
          puttingCategories={active.puttingCategories}
          mainThru="F"
          scratchThru="F"
        />
      ) : null}
    </div>
  );
}
