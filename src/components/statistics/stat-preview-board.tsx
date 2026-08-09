"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { StatPreviewCard } from "@/components/statistics/stat-preview-card";
import { ToughestHolesBoard } from "@/components/statistics/toughest-holes-board";
import { PlayoffsBoard } from "@/components/statistics/playoffs-board";
import { PlayerPopup } from "@/components/leaderboard/player-popup";
import { useFavorites } from "@/hooks/use-favorites";
import type { StatCategory } from "@/lib/statistics";
import type { HoleToughnessRow } from "@/lib/data/scoring-statistics";
import type { PlayoffResult } from "@/lib/data/playoffs";
import type { CompetitionEntry } from "@/lib/data/scorecards";

type StatSection = "nett" | "scratch" | "streaks" | "driving" | "approach" | "putting" | "playoffs" | "course";
type CategorySection = Exclude<StatSection, "course" | "playoffs">;

interface StatPreviewBoardProps {
  nettCategories: StatCategory[];
  scratchCategories: StatCategory[];
  streakCategories: StatCategory[];
  drivingCategories: StatCategory[];
  approachCategories: StatCategory[];
  puttingCategories: StatCategory[];
  toughestHolesNett: HoleToughnessRow[];
  toughestHolesScratch: HoleToughnessRow[];
  playoffs: PlayoffResult[];
  mainEntries: CompetitionEntry[];
  stablefordEntries: CompetitionEntry[];
  scratchEntries: CompetitionEntry[];
}

const SECTION_CATEGORIES: Record<CategorySection, keyof StatPreviewBoardProps> = {
  nett: "nettCategories",
  scratch: "scratchCategories",
  streaks: "streakCategories",
  driving: "drivingCategories",
  approach: "approachCategories",
  putting: "puttingCategories",
};

export function StatPreviewBoard(props: StatPreviewBoardProps) {
  const {
    toughestHolesNett,
    toughestHolesScratch,
    playoffs,
    mainEntries,
    stablefordEntries,
    scratchEntries,
    nettCategories,
    scratchCategories,
    streakCategories,
    drivingCategories,
    approachCategories,
    puttingCategories,
  } = props;
  const [section, setSection] = useState<StatSection>("nett");
  const categories =
    section === "course" || section === "playoffs" ? [] : (props[SECTION_CATEGORIES[section]] as StatCategory[]);

  const { favorites, toggleFavorite } = useFavorites();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const selectedMain = mainEntries.find((e) => e.player.id === selectedPlayerId);
  const selectedStableford = stablefordEntries.find((e) => e.player.id === selectedPlayerId);
  const selectedScratch = scratchEntries.find((e) => e.player.id === selectedPlayerId);
  const leaderToPar = mainEntries[0]?.toPar ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <label className="relative inline-flex items-center gap-2 rounded-full border border-surface-dark-foreground/30 px-4 py-2 text-sm font-bold uppercase tracking-wide text-surface-dark-foreground transition-colors hover:border-accent">
          <span className="sr-only">Select statistics category</span>
          <select
            value={section}
            onChange={(e) => setSection(e.target.value as StatSection)}
            className="cursor-pointer appearance-none bg-transparent pr-5 focus:outline-none"
          >
            <option value="nett" className="text-black">
              NETT SCORING
            </option>
            <option value="scratch" className="text-black">
              SCRATCH SCORING
            </option>
            <option value="streaks" className="text-black">
              STREAKS
            </option>
            <option value="driving" className="text-black">
              DRIVING
            </option>
            <option value="approach" className="text-black">
              APPROACH
            </option>
            <option value="putting" className="text-black">
              PUTTING
            </option>
            {playoffs.length > 0 && (
              <option value="playoffs" className="text-black">
                PLAYOFFS
              </option>
            )}
            <option value="course" className="text-black">
              COURSE SCORING
            </option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 h-4 w-4" />
        </label>
      </div>

      {section === "course" ? (
        <div className="flex flex-col gap-8">
          <ToughestHolesBoard title="Toughest Holes - Nett" rows={toughestHolesNett} />
          <ToughestHolesBoard title="Toughest Holes - Scratch" rows={toughestHolesScratch} />
        </div>
      ) : section === "playoffs" ? (
        <PlayoffsBoard results={playoffs} onSelectPlayer={setSelectedPlayerId} />
      ) : (
        <div className="flex flex-col gap-8">
          {categories.map((category) => (
            <StatPreviewCard key={category.key} category={category} onSelectPlayer={setSelectedPlayerId} />
          ))}
        </div>
      )}

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
        initialCompetition={section === "scratch" ? "scratch" : "main"}
        leaderToPar={leaderToPar}
        isFav={selectedPlayerId ? favorites.includes(selectedPlayerId) : false}
        onToggleFavorite={() => selectedPlayerId && toggleFavorite(selectedPlayerId)}
        open={!!selectedMain}
        onOpenChange={(next) => {
          if (!next) setSelectedPlayerId(null);
        }}
      />
    </div>
  );
}
