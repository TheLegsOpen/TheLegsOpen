"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { PlayerStatPanel } from "@/components/leaderboard/player-stat-panel";
import { TILE_CLASS, NEUTRAL_TILE_CLASS } from "@/components/leaderboard/leaderboard-table";
import { formatAverageToPar, type CareerSummary } from "@/lib/career-summary";
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
  /** His own career figures, shown in Career mode above the field-ranked ones. */
  careerSummary?: CareerSummary;
}

/** One career figure: the value in a tile, and what it is underneath. Same look as the stat panel's tiles. */
function SummaryValue({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      <span className={cn(TILE_CLASS, "min-w-[3rem]", NEUTRAL_TILE_CLASS)}>{value}</span>
      <p className="text-xs uppercase tracking-wide text-surface-dark-foreground/50">{label}</p>
    </div>
  );
}

function CareerSummaryCard({ summary }: { summary: CareerSummary }) {
  if (!summary.nett && !summary.gross) return null;
  const rounds = (n: number) => `${n} round${n === 1 ? "" : "s"}`;
  const { subPar, nines } = summary;
  const nineCount = (n: number) => `${n} nine${n === 1 ? "" : "s"}`;
  const nineTiles = (["nett", "gross"] as const).flatMap((mode) =>
    (["front", "back"] as const).flatMap((side) => {
      const figure = nines?.[mode]?.[side];
      const label = `${side === "front" ? "Front" : "Back"} 9 ${mode === "nett" ? "nett" : "gross"}`;
      return figure ? [{ key: `${mode}-${side}`, value: formatAverageToPar(figure.average), label: `${label}, ${nineCount(figure.rounds)}` }] : [];
    }),
  );
  const teeTimeTiles = (["nett", "gross"] as const).flatMap((mode) =>
    (["early", "late"] as const).flatMap((half) => {
      const figure = summary.teeTimes?.[mode]?.[half];
      const label = `${half === "early" ? "Early" : "Late"} ${mode}`;
      return figure ? [{ key: `${mode}-${half}`, value: formatAverageToPar(figure.average), label: `${label}, ${rounds(figure.rounds)}` }] : [];
    }),
  );
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-3">
      <div className="border border-surface-dark-foreground/15 bg-surface-dark-foreground/5 p-4">
        <p className="mb-3 font-display text-base font-bold">Scoring average</p>
        <div className="flex flex-wrap gap-6">
          {summary.nett ? <SummaryValue value={formatAverageToPar(summary.nett.average)} label={`Nett, ${rounds(summary.nett.rounds)}`} /> : null}
          {summary.gross ? <SummaryValue value={formatAverageToPar(summary.gross.average)} label={`Gross, ${rounds(summary.gross.rounds)}`} /> : null}
        </div>
        <p className="mt-3 text-xs text-surface-dark-foreground/50">Completed rounds only, to par.</p>
      </div>
      {nineTiles.length > 0 ? (
        <div className="border border-surface-dark-foreground/15 bg-surface-dark-foreground/5 p-4">
          <p className="mb-3 font-display text-base font-bold">Scoring average by nine</p>
          <div className="flex flex-wrap gap-6">
            {nineTiles.map((tile) => (
              <SummaryValue key={tile.key} value={tile.value} label={tile.label} />
            ))}
          </div>
          <p className="mt-3 text-xs text-surface-dark-foreground/50">Every complete nine, to par, a no-return&apos;s finished nine included.</p>
        </div>
      ) : null}
      {teeTimeTiles.length > 0 ? (
        <div className="border border-surface-dark-foreground/15 bg-surface-dark-foreground/5 p-4">
          <p className="mb-3 font-display text-base font-bold">Scoring average by tee time</p>
          <div className="flex flex-wrap gap-6">
            {teeTimeTiles.map((tile) => (
              <SummaryValue key={tile.key} value={tile.value} label={tile.label} />
            ))}
          </div>
          <p className="mt-3 text-xs text-surface-dark-foreground/50">
            Completed rounds, to par. Early is the first half of that year&apos;s groups off, late the second; the middle group of an odd
            number is in neither.
          </p>
        </div>
      ) : null}
      {subPar ? (
        <div className="border border-surface-dark-foreground/15 bg-surface-dark-foreground/5 p-4">
          <p className="mb-3 font-display text-base font-bold">Rounds under par</p>
          <div className="flex flex-wrap gap-6">
            <SummaryValue value={String(subPar.nett.rounds)} label="Nett" />
            {/* A run only says something beyond the count once it reaches two. Through 2026 nobody
                has been under par nett more than once (nine rounds in all, nine players), so until
                someone does, this would only repeat the count. */}
            {subPar.nett.bestStreak > 1 ? <SummaryValue value={String(subPar.nett.bestStreak)} label="Nett, most in a row" /> : null}
            {/* Nobody has finished a Legs Open under par gross (the lowest round is a 74, two
                over), so the gross figures only appear for a player who has. */}
            {subPar.gross.rounds > 0 ? <SummaryValue value={String(subPar.gross.rounds)} label="Gross" /> : null}
            {subPar.gross.bestStreak > 1 ? <SummaryValue value={String(subPar.gross.bestStreak)} label="Gross, most in a row" /> : null}
          </div>
          <p className="mt-3 text-xs text-surface-dark-foreground/50">
            Completed rounds below par; level par doesn&apos;t count.
            {subPar.nett.bestStreak > 1 || subPar.gross.bestStreak > 1 ? " A no-return ends a run." : ""}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function StatsTab({ playerId, careerCategories, years, careerSummary }: StatsTabProps) {
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
    <div className="-mx-5 flex flex-col gap-6 bg-surface-dark px-5 py-6 text-surface-dark-foreground sm:mx-0 sm:p-6">
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
      ) : null}

      {mode === "career" && careerSummary ? <CareerSummaryCard summary={careerSummary} /> : null}

      {isLoading ? null : active ? (
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
