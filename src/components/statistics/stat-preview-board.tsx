"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { StatPreviewCard } from "@/components/statistics/stat-preview-card";
import type { StatCategory } from "@/lib/statistics";
import type { ScoringMode } from "@/lib/data/scoring-statistics";

interface StatPreviewBoardProps {
  nettCategories: StatCategory[];
  scratchCategories: StatCategory[];
}

export function StatPreviewBoard({ nettCategories, scratchCategories }: StatPreviewBoardProps) {
  const [mode, setMode] = useState<ScoringMode>("nett");
  const categories = mode === "nett" ? nettCategories : scratchCategories;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <label className="relative inline-flex items-center gap-2 rounded-full border border-surface-dark-foreground/30 px-4 py-2 text-sm font-bold uppercase tracking-wide text-surface-dark-foreground transition-colors hover:border-accent">
          <span className="sr-only">Select statistics category</span>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as ScoringMode)}
            className="cursor-pointer appearance-none bg-transparent pr-5 focus:outline-none"
          >
            <option value="nett" className="text-black">
              NETT SCORING
            </option>
            <option value="scratch" className="text-black">
              SCRATCH SCORING
            </option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 h-4 w-4" />
        </label>
      </div>

      <div className="flex flex-col gap-8">
        {categories.map((category) => (
          <StatPreviewCard key={category.key} category={category} />
        ))}
      </div>
    </div>
  );
}
