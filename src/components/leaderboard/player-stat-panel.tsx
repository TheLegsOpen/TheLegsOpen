"use client";

import { useState } from "react";

import { cn, ordinal } from "@/lib/utils";
import { scorePillClass, TILE_CLASS, NEUTRAL_TILE_CLASS } from "@/components/leaderboard/leaderboard-table";
import type { StatCategory, StatRow } from "@/lib/statistics";
import type { ScoringMode } from "@/lib/data/scoring-statistics";

type StatTabKey = "nett" | "scratch" | "streaks" | "driving" | "approach" | "putting";

/** Add a new entry here (plus a case in the switch below) to bring on another stat category later. */
const STAT_TABS: { key: StatTabKey; label: string }[] = [
  { key: "nett", label: "Nett Scoring" },
  { key: "scratch", label: "Scratch Scoring" },
  { key: "streaks", label: "Streaks" },
  { key: "driving", label: "Driving" },
  { key: "approach", label: "Approach" },
  { key: "putting", label: "Putting" },
];

function findRow(categories: StatCategory[], key: string, playerId: string): StatRow | undefined {
  return categories.find((category) => category.key === key)?.rows.find((row) => row.player.id === playerId);
}

function StatCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-surface-dark-foreground/15 bg-surface-dark-foreground/5 p-4">
      <p className="mb-3 font-display text-base font-bold">{title}</p>
      <div className="flex flex-wrap gap-6">{children}</div>
    </div>
  );
}

function StatValue({ row, useParColoring, label }: { row: StatRow | undefined; useParColoring?: boolean; label: string }) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="flex items-center gap-2">
        <span className={cn(TILE_CLASS, "min-w-[3rem]", row && useParColoring ? scorePillClass(row.value) : NEUTRAL_TILE_CLASS)}>
          {row ? row.display : "—"}
        </span>
        {row?.position ? (
          <span className="text-sm text-surface-dark-foreground/60">
            {row.tied ? "T" : ""}
            {ordinal(row.position)}
          </span>
        ) : null}
      </div>
      <p className="text-xs uppercase tracking-wide text-surface-dark-foreground/50">{label}</p>
    </div>
  );
}

function formatThru(thru: string): string {
  if (thru === "F") return "18";
  if (thru === "-") return "0";
  return thru;
}

function ScoringCards({
  categories,
  mode,
  playerId,
  thru,
}: {
  categories: StatCategory[];
  mode: ScoringMode;
  playerId: string;
  thru: string;
}) {
  const par3 = findRow(categories, `par-3-scoring-${mode}`, playerId);
  const par4 = findRow(categories, `par-4-scoring-${mode}`, playerId);
  const par5 = findRow(categories, `par-5-scoring-${mode}`, playerId);
  const birdies = findRow(categories, `most-birdies-or-better-${mode}`, playerId);
  const bogeys = findRow(categories, `most-bogeys-or-worse-${mode}`, playerId);
  const strokesGained = findRow(categories, `strokes-gained-${mode}`, playerId);

  return (
    <div className="flex flex-col gap-3">
      <StatCard title="Scoring by par vs field">
        <StatValue row={par3} useParColoring label="Par 3s" />
        <StatValue row={par4} useParColoring label="Par 4s" />
        <StatValue row={par5} useParColoring label="Par 5s" />
      </StatCard>
      <StatCard title="Hole scores">
        <StatValue row={birdies} label="Birdies or Better" />
        <StatValue row={bogeys} label="Bogeys or Worse" />
      </StatCard>
      <StatCard title="Strokes Gained">
        <StatValue row={strokesGained} useParColoring label={`Thru ${formatThru(thru)} of 18 holes`} />
      </StatCard>
    </div>
  );
}

function StreakCards({ categories, playerId }: { categories: StatCategory[]; playerId: string }) {
  const parOrBetter = findRow(categories, "longest-par-or-better-streak-nett", playerId);
  const parStreak = findRow(categories, "longest-par-streak-nett", playerId);
  const bogeyOrWorse = findRow(categories, "longest-bogey-or-worse-streak-nett", playerId);

  return (
    <StatCard title="Longest streaks">
      <StatValue row={parOrBetter} label="Par or Better" />
      <StatValue row={parStreak} label="Par" />
      <StatValue row={bogeyOrWorse} label="Bogey or Worse" />
    </StatCard>
  );
}

function DrivingCards({ categories, playerId }: { categories: StatCategory[]; playerId: string }) {
  const fairwaysHit = findRow(categories, "fairways-hit", playerId);
  const strokesGained = findRow(categories, "driving-strokes-gained", playerId);

  return (
    <StatCard title="Driving">
      <StatValue row={fairwaysHit} label="Fairways Hit" />
      <StatValue row={strokesGained} useParColoring label="Strokes Gained" />
    </StatCard>
  );
}

function ApproachCards({ categories, playerId }: { categories: StatCategory[]; playerId: string }) {
  const gir = findRow(categories, "greens-in-regulation", playerId);
  const strokesGained = findRow(categories, "approach-strokes-gained", playerId);

  return (
    <StatCard title="Approach">
      <StatValue row={gir} label="Greens in Regulation" />
      <StatValue row={strokesGained} useParColoring label="Strokes Gained" />
    </StatCard>
  );
}

function PuttingCards({ categories, playerId }: { categories: StatCategory[]; playerId: string }) {
  const putts = findRow(categories, "putts", playerId);
  const strokesGained = findRow(categories, "putting-strokes-gained", playerId);

  return (
    <StatCard title="Putting">
      <StatValue row={putts} label="Number of Putts" />
      <StatValue row={strokesGained} useParColoring label="Strokes Gained" />
    </StatCard>
  );
}

export function PlayerStatPanel({
  playerId,
  nettCategories,
  scratchCategories,
  streakCategories,
  drivingCategories,
  approachCategories,
  puttingCategories,
  mainThru,
  scratchThru,
}: {
  playerId: string;
  nettCategories: StatCategory[];
  scratchCategories: StatCategory[];
  streakCategories: StatCategory[];
  drivingCategories: StatCategory[];
  approachCategories: StatCategory[];
  puttingCategories: StatCategory[];
  mainThru: string;
  scratchThru: string;
}) {
  const [tab, setTab] = useState<StatTabKey>("nett");

  const hasAnyData = [nettCategories, scratchCategories, streakCategories, drivingCategories, approachCategories, puttingCategories].some(
    (categories) => categories.some((category) => category.rows.some((row) => row.player.id === playerId)),
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {STAT_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors",
              tab === t.key
                ? "border-accent bg-accent text-accent-foreground"
                : "border-surface-dark-foreground/30 text-surface-dark-foreground hover:border-accent hover:text-accent",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!hasAnyData ? (
        <p className="border border-dashed border-surface-dark-foreground/20 p-4 text-sm text-surface-dark-foreground/60">
          No statistics yet — this player hasn&apos;t posted a score.
        </p>
      ) : tab === "nett" ? (
        <ScoringCards categories={nettCategories} mode="nett" playerId={playerId} thru={mainThru} />
      ) : tab === "scratch" ? (
        <ScoringCards categories={scratchCategories} mode="scratch" playerId={playerId} thru={scratchThru} />
      ) : tab === "streaks" ? (
        <StreakCards categories={streakCategories} playerId={playerId} />
      ) : tab === "driving" ? (
        <DrivingCards categories={drivingCategories} playerId={playerId} />
      ) : tab === "approach" ? (
        <ApproachCards categories={approachCategories} playerId={playerId} />
      ) : (
        <PuttingCards categories={puttingCategories} playerId={playerId} />
      )}
    </div>
  );
}
