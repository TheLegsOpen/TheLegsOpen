"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { StatPreviewCard } from "@/components/statistics/stat-preview-card";
import { ToughestHolesBoard } from "@/components/statistics/toughest-holes-board";
import type { StatCategory } from "@/lib/statistics";
import type { HoleToughnessRow } from "@/lib/data/scoring-statistics";

type StatSection = "nett" | "scratch" | "streaks" | "course";

interface StatPreviewBoardProps {
  nettCategories: StatCategory[];
  scratchCategories: StatCategory[];
  streakCategories: StatCategory[];
  toughestHolesNett: HoleToughnessRow[];
  toughestHolesScratch: HoleToughnessRow[];
}

export function StatPreviewBoard({
  nettCategories,
  scratchCategories,
  streakCategories,
  toughestHolesNett,
  toughestHolesScratch,
}: StatPreviewBoardProps) {
  const [section, setSection] = useState<StatSection>("nett");
  const categories = section === "nett" ? nettCategories : section === "scratch" ? scratchCategories : streakCategories;

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
      ) : (
        <div className="flex flex-col gap-8">
          {categories.map((category) => (
            <StatPreviewCard key={category.key} category={category} />
          ))}
        </div>
      )}
    </div>
  );
}
