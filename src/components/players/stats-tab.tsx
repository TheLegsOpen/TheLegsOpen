"use client";

import { useState } from "react";

import { PlayerStatPanel } from "@/components/leaderboard/player-stat-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { StatCategory } from "@/lib/statistics";

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
  const [scope, setScope] = useState<"career" | string>("career");
  const [cache, setCache] = useState<Record<string, SixCategories>>({});

  async function selectYear(championshipId: string) {
    setScope(championshipId);
    if (cache[championshipId]) return;

    const res = await fetch(`/api/players/year-stats?championshipId=${championshipId}`);
    if (!res.ok) return;
    const data = (await res.json()) as SixCategories;
    setCache((prev) => ({ ...prev, [championshipId]: data }));
  }

  const active = scope === "career" ? careerCategories : cache[scope];
  const isLoading = scope !== "career" && !active;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setScope("career")}
          className={cn(
            "rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors",
            scope === "career" ? "border-accent bg-accent text-accent-foreground" : "border-border text-muted-foreground hover:border-accent hover:text-accent",
          )}
        >
          Career
        </button>
        {years.map((y) => (
          <button
            key={y.championshipId}
            type="button"
            onClick={() => selectYear(y.championshipId)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors",
              scope === y.championshipId ? "border-accent bg-accent text-accent-foreground" : "border-border text-muted-foreground hover:border-accent hover:text-accent",
            )}
          >
            {y.year}
          </button>
        ))}
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
