"use client";

import { Clock } from "lucide-react";

import { cn, splitSurnameFirst } from "@/lib/utils";
import { formatToPar } from "@/lib/leaderboard";
import { CountryFlag } from "@/components/shared/country-flag";
import {
  scorePillClass,
  holeScorePillClass,
  TILE_CLASS,
  NEUTRAL_TILE_CLASS,
  AnimatedValue,
} from "@/components/leaderboard/leaderboard-table";
import type { CompetitionEntry } from "@/lib/data/scorecards";

interface HoleByHoleTableProps {
  entries: CompetitionEntry[];
  onSelectPlayer: (playerId: string) => void;
}

const HOLE_INDICES = Array.from({ length: 18 }, (_, i) => i);

export function HoleByHoleTable({ entries, onSelectPlayer }: HoleByHoleTableProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-surface-dark-foreground/20 py-16 text-center">
        <p className="font-display font-bold text-lg">Field not yet set</p>
        <p className="text-sm text-surface-dark-foreground/60">The field will appear here once tee times are generated for this championship.</p>
      </div>
    );
  }

  // Every player shares the same venue holes, so the first entry's par-per-hole stands in for the course.
  const coursePars = entries[0].holes;

  return (
    <div className="overflow-x-auto border border-surface-dark-foreground/15">
      <table className="w-full min-w-[1300px] table-fixed border-collapse text-sm">
        <colgroup>
          <col className="w-12" />
          <col className="w-40" />
          <col className="w-20" />
          <col className="w-16" />
          {HOLE_INDICES.map((i) => (
            <col key={i} className="w-11" />
          ))}
          <col className="w-20" />
        </colgroup>
        <thead>
          <tr className="border-b border-surface-dark-foreground/15 bg-surface-dark-foreground/5 text-left text-xs uppercase tracking-wide text-surface-dark-foreground/60">
            <th className="px-2 py-3">Pos</th>
            <th className="px-2 py-3">Player</th>
            <th className="px-2 py-3 text-right" aria-label="Tee time" />
            <th className="px-2 py-3 text-right">Par</th>
            {HOLE_INDICES.map((i) => (
              <th key={i} className="px-1 py-1 text-center">
                <span className="block">{i + 1}</span>
                <span className="block font-normal normal-case text-surface-dark-foreground/40">{coursePars[i]?.par ?? "—"}</span>
              </th>
            ))}
            <th className="px-4 py-3 text-right">Round</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const { surname, firstName } = splitSurnameFirst(entry.player.name);
            return (
              <tr key={entry.player.id} className="bg-accent/90 text-accent-foreground hover:bg-accent">
                <td className="px-2 py-3 tabular-nums">
                  {entry.tied ? "T" : ""}
                  {entry.position}
                </td>
                <td className="px-2 py-3">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => onSelectPlayer(entry.player.id)} className="truncate hover:underline">
                      <span className="font-bold">{surname}</span>
                      <span className="font-normal">, {firstName}</span>
                    </button>
                    <CountryFlag code={entry.player.countryCode} className="h-3 w-4 shrink-0 align-middle" />
                  </div>
                </td>
                <td className="whitespace-nowrap px-2 py-3 text-right text-xs tabular-nums text-accent-foreground/70">
                  {!entry.started && entry.teeTime ? (
                    <span className="inline-flex items-center justify-end gap-1.5 leading-none">
                      <Clock className="h-3 w-3 shrink-0" />
                      {entry.teeTime}
                    </span>
                  ) : null}
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
                    <span className={cn(TILE_CLASS, "min-w-0 w-9", hole.value !== undefined ? holeScorePillClass(hole.relative) : NEUTRAL_TILE_CLASS)}>
                      <AnimatedValue value={hole.value ?? ""} />
                    </span>
                  </td>
                ))}
                <td className="px-4 py-3 text-right tabular-nums">
                  <span className={cn(TILE_CLASS, NEUTRAL_TILE_CLASS)}>
                    <AnimatedValue value={entry.started && entry.score !== undefined ? entry.score : "-"} />
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
