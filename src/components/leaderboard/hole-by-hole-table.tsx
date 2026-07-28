"use client";

import Link from "next/link";

import { cn, playerSlug, splitSurnameFirst } from "@/lib/utils";
import { formatToPar } from "@/lib/leaderboard";
import { CountryFlag } from "@/components/shared/country-flag";
import { scorePillClass, TILE_CLASS, NEUTRAL_TILE_CLASS, AnimatedValue } from "@/components/leaderboard/leaderboard-table";
import type { CompetitionEntry } from "@/lib/data/scorecards";

interface HoleByHoleTableProps {
  entries: CompetitionEntry[];
}

const HOLE_INDICES = Array.from({ length: 18 }, (_, i) => i);

export function HoleByHoleTable({ entries }: HoleByHoleTableProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-surface-dark-foreground/20 py-16 text-center">
        <p className="font-display font-bold text-lg">Field not yet set</p>
        <p className="text-sm text-surface-dark-foreground/60">The field will appear here once tee times are generated for this championship.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-surface-dark-foreground/15">
      <table className="w-full min-w-[1200px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-surface-dark-foreground/15 bg-surface-dark-foreground/5 text-left text-xs uppercase tracking-wide text-surface-dark-foreground/60">
            <th className="px-2 py-3">Pos</th>
            <th className="px-2 py-3">Player</th>
            <th className="border-t-2 border-accent px-2 py-3 text-right">Par</th>
            {HOLE_INDICES.map((i) => (
              <th key={i} className="border-t-2 border-accent px-1 py-1 text-center">
                <span className="block">{i + 1}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const { surname, firstName } = splitSurnameFirst(entry.player.name);
            return (
              <tr key={entry.player.id} className="border-b border-surface-dark-foreground/15 bg-accent/90 text-accent-foreground last:border-0 hover:bg-accent">
                <td className="px-2 py-3 tabular-nums">
                  {entry.tied ? "T" : ""}
                  {entry.position}
                </td>
                <td className="px-2 py-3 whitespace-nowrap">
                  <Link href={`/players/${playerSlug(entry.player)}`} className="hover:underline">
                    <span className="font-bold">{surname}</span>
                    <span className="font-normal">, {firstName}</span>
                  </Link>
                  <CountryFlag code={entry.player.countryCode} className="ml-2 h-3 w-4 align-middle" />
                </td>
                <td className="px-2 py-3 text-right">
                  {entry.toPar !== undefined ? (
                    <span className={cn(TILE_CLASS, scorePillClass(entry.toPar))}>
                      <AnimatedValue value={formatToPar(entry.toPar)} />
                    </span>
                  ) : (
                    <span className="text-accent-foreground/50">—</span>
                  )}
                </td>
                {entry.holes.map((hole) => (
                  <td key={hole.holeNumber} className="px-1 py-1 text-center">
                    <span className={cn(TILE_CLASS, "min-w-0 w-9", hole.value !== undefined ? scorePillClass(hole.relative) : NEUTRAL_TILE_CLASS)}>
                      <AnimatedValue value={hole.value ?? ""} />
                    </span>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
