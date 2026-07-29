"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { CountryFlag } from "@/components/shared/country-flag";
import { cn, playerSlug, surnameFirst } from "@/lib/utils";
import { scorePillClass, TILE_CLASS } from "@/components/leaderboard/leaderboard-table";
import type { StatCategory } from "@/lib/statistics";

interface StatExplorerProps {
  categories: StatCategory[];
}

export function StatExplorer({ categories }: StatExplorerProps) {
  const [selectedKey, setSelectedKey] = useState(categories[0]?.key);
  const selected = categories.find((c) => c.key === selectedKey) ?? categories[0];

  if (!selected) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap justify-end gap-3">
        <label className="relative inline-flex items-center gap-2 rounded-full border border-surface-dark-foreground/30 px-4 py-2 text-sm font-bold uppercase tracking-wide text-surface-dark-foreground transition-colors hover:border-accent">
          <span className="sr-only">Select statistics category</span>
          <select className="cursor-pointer appearance-none bg-transparent pr-5 focus:outline-none" defaultValue="nett-scoring">
            <option value="nett-scoring" className="text-black">
              NETT SCORING
            </option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 h-4 w-4" />
        </label>

        <label className="relative inline-flex items-center gap-2 rounded-full border border-surface-dark-foreground/30 px-4 py-2 text-sm font-bold uppercase tracking-wide text-surface-dark-foreground transition-colors hover:border-accent">
          <span className="sr-only">Select statistic</span>
          <select
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
            className="cursor-pointer appearance-none bg-transparent pr-5 focus:outline-none"
          >
            {categories.map((category) => (
              <option key={category.key} value={category.key} className="text-black">
                {category.title.toUpperCase()}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 h-4 w-4" />
        </label>
      </div>

      <div className="overflow-hidden border border-surface-dark-foreground/15">
        <div className="flex items-center justify-between bg-surface-dark-foreground/5 px-4 py-3 text-xs font-bold uppercase tracking-wide text-surface-dark-foreground/60">
          <span>Rank</span>
          <span>{selected.columnLabel}</span>
        </div>

        {selected.rows.length === 0 ? (
          <div className="flex flex-col items-center gap-1 border border-dashed border-surface-dark-foreground/20 py-8 text-center">
            <p className="text-sm text-surface-dark-foreground/60">No holes of this par played yet.</p>
          </div>
        ) : (
          selected.rows.map((row) => (
            <div
              key={row.player.id}
              className="flex items-center justify-between gap-4 border-b border-surface-dark-foreground/15 bg-accent/90 px-4 py-3 text-accent-foreground last:border-0"
            >
              <div className="flex items-center gap-3 text-sm">
                <span className="w-8 tabular-nums">
                  {row.tied ? "T" : ""}
                  {row.position}
                </span>
                <CountryFlag code={row.player.countryCode} className="h-3 w-4" />
                <Link href={`/players/${playerSlug(row.player)}`} className="font-medium hover:underline">
                  {surnameFirst(row.player.name)}
                </Link>
              </div>
              <span className={cn(TILE_CLASS, "text-xs", scorePillClass(row.value))}>{row.display}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
