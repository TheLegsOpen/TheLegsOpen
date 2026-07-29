"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, Star } from "lucide-react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CountryFlag } from "@/components/shared/country-flag";
import { PlaceholderArt } from "@/components/shared/placeholder-art";
import { formatToPar } from "@/lib/leaderboard";
import { cn, playerSlug, splitSurnameFirst } from "@/lib/utils";
import { scorePillClass, holeScorePillClass, TILE_CLASS, NEUTRAL_TILE_CLASS } from "@/components/leaderboard/leaderboard-table";
import type { CompetitionEntry, Competition } from "@/lib/data/scorecards";

const FRONT_NINE = Array.from({ length: 9 }, (_, i) => i);
const BACK_NINE = Array.from({ length: 9 }, (_, i) => i + 9);

const COMPETITION_OPTIONS: { value: Competition; label: string }[] = [
  { value: "main", label: "Main scorecard" },
  { value: "stableford", label: "Stableford scorecard" },
  { value: "scratch", label: "Scratch scorecard" },
];

function sumHoles(entry: CompetitionEntry, indices: number[]): number | undefined {
  const values = indices.map((i) => entry.holes[i]?.value);
  if (values.some((v) => v === undefined)) return undefined;
  return (values as number[]).reduce((a, b) => a + b, 0);
}

interface PlayerPopupProps {
  main?: CompetitionEntry;
  stableford?: CompetitionEntry;
  scratch?: CompetitionEntry;
  /** Which tab the popup was opened from -- the dropdown defaults here, then can be freely changed. */
  initialCompetition: Competition;
  leaderToPar: number;
  isFav: boolean;
  onToggleFavorite: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlayerPopup({
  main,
  stableford,
  scratch,
  initialCompetition,
  leaderToPar,
  isFav,
  onToggleFavorite,
  open,
  onOpenChange,
}: PlayerPopupProps) {
  const [competition, setCompetition] = useState<Competition>(initialCompetition);

  useEffect(() => {
    if (open) setCompetition(initialCompetition);
  }, [open, initialCompetition]);

  if (!main) return null;
  const { player } = main;
  const { surname, firstName } = splitSurnameFirst(player.name);

  const shotsOffLead = main.toPar !== undefined ? main.toPar - leaderToPar : undefined;
  const leadText =
    shotsOffLead === undefined
      ? "Yet to start."
      : shotsOffLead === 0
        ? "Leading the championship."
        : `${shotsOffLead} shot${shotsOffLead === 1 ? "" : "s"} off the lead.`;

  const entryByCompetition: Record<Competition, CompetitionEntry | undefined> = { main, stableford, scratch };
  const activeEntry = entryByCompetition[competition];
  const isStableford = competition === "stableford";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-full max-w-5xl overflow-y-auto border-none bg-surface-dark p-0 text-surface-dark-foreground">
        <DialogTitle className="sr-only">{player.name}</DialogTitle>

        <div className="relative flex flex-col gap-4 bg-primary p-6 text-primary-foreground sm:flex-row sm:items-start">
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-pressed={isFav}
            aria-label={`${isFav ? "Remove" : "Add"} ${player.name} ${isFav ? "from" : "to"} favorites`}
            className="absolute left-4 top-4 text-primary-foreground/70 transition-colors hover:text-accent"
          >
            <Star className={cn("h-5 w-5", isFav && "fill-current text-accent")} />
          </button>

          <div className="mt-8 flex items-start gap-4 sm:mt-0">
            <span
              className={cn(
                "inline-flex h-12 w-14 shrink-0 items-center justify-center font-display text-xl font-bold tabular-nums",
                main.toPar !== undefined ? scorePillClass(main.toPar) : "bg-primary-foreground/15",
              )}
            >
              {main.toPar !== undefined ? formatToPar(main.toPar) : "—"}
            </span>

            <PlaceholderArt
              label={`${player.name} portrait`}
              imageUrl={player.photoUrl}
              tone="navy"
              ratio="3/4"
              className="h-[72px] w-14 shrink-0"
            />

            <div>
              <p className="font-display text-lg">{firstName}</p>
              <h2 className="-mt-1 font-display text-3xl font-bold uppercase leading-none">{surname}</h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-primary-foreground/70">
                <CountryFlag code={player.countryCode} className="h-3 w-4" />
                {player.country}
              </p>
            </div>
          </div>

          <div className="text-sm text-primary-foreground/80 sm:ml-auto sm:text-right">
            <p className="font-bold">
              Position {main.tied ? "T" : ""}
              {main.position}
            </p>
            <p>{leadText}</p>
          </div>
        </div>

        <div className="p-6">
          <label className="relative mb-4 inline-flex items-center gap-2 rounded-full border border-surface-dark-foreground/30 px-4 py-2 text-sm font-bold uppercase tracking-wide text-surface-dark-foreground transition-colors hover:border-accent">
            <span className="sr-only">Select competition</span>
            <select
              value={competition}
              onChange={(e) => setCompetition(e.target.value as Competition)}
              className="cursor-pointer appearance-none bg-transparent pr-5 focus:outline-none"
            >
              {COMPETITION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="text-black">
                  {opt.label.toUpperCase()}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 h-4 w-4" />
          </label>

          {activeEntry ? (
            <div className="overflow-x-auto border border-surface-dark-foreground/15">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-surface-dark-foreground/5 text-center text-xs uppercase tracking-wide text-surface-dark-foreground/60">
                    {FRONT_NINE.map((i) => (
                      <th key={i} className="px-0.5 py-1">
                        <span className="block">{i + 1}</span>
                        <span className="block font-normal normal-case text-surface-dark-foreground/40">{activeEntry.holes[i]?.par}</span>
                      </th>
                    ))}
                    <th className="px-0.5 py-1">Out</th>
                    {BACK_NINE.map((i) => (
                      <th key={i} className="px-0.5 py-1">
                        <span className="block">{i + 1}</span>
                        <span className="block font-normal normal-case text-surface-dark-foreground/40">{activeEntry.holes[i]?.par}</span>
                      </th>
                    ))}
                    <th className="px-0.5 py-1">In</th>
                    <th className="px-0.5 py-1">Tot</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {FRONT_NINE.map((i) => {
                      const hole = activeEntry.holes[i];
                      return (
                        <td key={i} className="px-0.5 py-1 text-center">
                          <span className={cn(TILE_CLASS, "min-w-0 w-8 px-0", hole?.value !== undefined ? holeScorePillClass(hole.relative) : NEUTRAL_TILE_CLASS)}>
                            {hole?.value ?? ""}
                          </span>
                        </td>
                      );
                    })}
                    <td className="px-0.5 py-1 text-center">
                      <span className={cn(TILE_CLASS, "min-w-0 w-8 px-0", NEUTRAL_TILE_CLASS)}>{sumHoles(activeEntry, FRONT_NINE) ?? "—"}</span>
                    </td>
                    {BACK_NINE.map((i) => {
                      const hole = activeEntry.holes[i];
                      return (
                        <td key={i} className="px-0.5 py-1 text-center">
                          <span className={cn(TILE_CLASS, "min-w-0 w-8 px-0", hole?.value !== undefined ? holeScorePillClass(hole.relative) : NEUTRAL_TILE_CLASS)}>
                            {hole?.value ?? ""}
                          </span>
                        </td>
                      );
                    })}
                    <td className="px-0.5 py-1 text-center">
                      <span className={cn(TILE_CLASS, "min-w-0 w-8 px-0", NEUTRAL_TILE_CLASS)}>{sumHoles(activeEntry, BACK_NINE) ?? "—"}</span>
                    </td>
                    <td className="px-0.5 py-1 text-center">
                      <span className={cn(TILE_CLASS, "min-w-0 w-8 px-0", NEUTRAL_TILE_CLASS)}>
                        {isStableford ? (activeEntry.score ?? 0) : (activeEntry.score ?? "—")}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-surface-dark-foreground/60">No scorecard yet for this competition.</p>
          )}

          <div className="mt-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-surface-dark-foreground/50">Statistics</p>
            <p className="border border-dashed border-surface-dark-foreground/20 p-4 text-sm text-surface-dark-foreground/60">
              Player statistics for this championship aren&apos;t built yet — check back soon.
            </p>
          </div>

          <Link
            href={`/players/${playerSlug(player)}`}
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-accent hover:text-accent/80"
          >
            Full player profile <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
