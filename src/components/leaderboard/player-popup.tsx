"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, Star } from "lucide-react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CountryFlag } from "@/components/shared/country-flag";
import { PlaceholderArt } from "@/components/shared/placeholder-art";
import { formatToPar, positionLabel } from "@/lib/leaderboard";
import { cn, cutoutUrl, playerSlug, splitSurnameFirst } from "@/lib/utils";
import { scorePillClass } from "@/components/leaderboard/leaderboard-table";
import { PlayerStatPanel } from "@/components/leaderboard/player-stat-panel";
import { ScorecardGrid } from "@/components/players/scorecard-grid";
import type { CompetitionEntry, Competition } from "@/lib/data/scorecards";
import type { RankedEntry } from "@/lib/data/playoffs";
import type { StatCategory } from "@/lib/statistics";

const COMPETITION_OPTIONS: { value: Competition; label: string }[] = [
  { value: "main", label: "Main scorecard" },
  { value: "stableford", label: "Stableford scorecard" },
  { value: "scratch", label: "Scratch scorecard" },
];

interface PlayerPopupProps {
  main?: CompetitionEntry;
  stableford?: CompetitionEntry;
  scratch?: CompetitionEntry;
  nettCategories: StatCategory[];
  scratchCategories: StatCategory[];
  streakCategories: StatCategory[];
  drivingCategories: StatCategory[];
  approachCategories: StatCategory[];
  puttingCategories: StatCategory[];
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
  nettCategories,
  scratchCategories,
  streakCategories,
  drivingCategories,
  approachCategories,
  puttingCategories,
  initialCompetition,
  leaderToPar,
  isFav,
  onToggleFavorite,
  open,
  onOpenChange,
}: PlayerPopupProps) {
  const [competition, setCompetition] = useState<Competition>(initialCompetition);

  // Each time the pop-up opens it starts on the leaderboard's current competition. Done while
  // rendering rather than in an effect, React's recommended way to reset state when a prop
  // changes: an effect would paint the old competition for a frame first, then render again.
  const [synced, setSynced] = useState({ open, initialCompetition });
  if (synced.open !== open || synced.initialCompetition !== initialCompetition) {
    setSynced({ open, initialCompetition });
    if (open) setCompetition(initialCompetition);
  }

  if (!main) return null;
  const { player } = main;
  const { surname, firstName } = splitSurnameFirst(player.name);

  const shotsOffLead = main.toPar !== undefined ? main.toPar - leaderToPar : undefined;
  // Level with the leader after a playoff is not leading: the playoff decided it.
  const mainPlayoff = (main as RankedEntry).playoffNote;
  const leadText = main.withdrawn
    ? "Withdrawn."
    : main.noReturn
      ? "No return."
      : mainPlayoff && mainPlayoff.label !== "Ineligible"
        ? `${mainPlayoff.won ? "Won" : "Lost"} the playoff.`
      : shotsOffLead === undefined
        ? "Yet to start."
        : shotsOffLead === 0
          ? "Leading the championship."
          : `${shotsOffLead} shot${shotsOffLead === 1 ? "" : "s"} off the lead.`;

  const entryByCompetition: Record<Competition, CompetitionEntry | undefined> = { main, stableford, scratch };
  const activeEntry = entryByCompetition[competition];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-full max-w-5xl overflow-y-auto border-none bg-surface-dark p-0 text-surface-dark-foreground">
        <DialogTitle className="sr-only">{player.name}</DialogTitle>

        <div className="relative flex flex-col gap-3 bg-primary p-5 pl-14 pr-16 text-primary-foreground sm:flex-row sm:items-start">
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-pressed={isFav}
            aria-label={`${isFav ? "Remove" : "Add"} ${player.name} ${isFav ? "from" : "to"} favorites`}
            className="absolute left-4 top-4 text-primary-foreground/70 transition-colors hover:text-accent"
          >
            <Star className={cn("h-5 w-5", isFav && "fill-current text-accent")} />
          </button>

          {/* On phones the name drops onto its own line under the score and photo: beside them it
              had about 65px, so a surname like LEISEGANG ran past the edge and the whole pop-out
              scrolled sideways. */}
          <div className="mt-8 flex min-w-0 flex-wrap items-start gap-3 sm:mt-0 sm:flex-nowrap">
            <span
              className={cn(
                "inline-flex h-12 w-14 shrink-0 items-center justify-center font-display text-xl font-bold tabular-nums",
                main.withdrawn || main.noReturn || main.toPar === undefined
                  ? main.withdrawn || main.noReturn
                    ? "bg-[#B0B0B0] text-[#08325A]"
                    : "bg-primary-foreground/15"
                  : scorePillClass(main.toPar),
              )}
            >
              {main.withdrawn ? "WD" : main.noReturn ? "NR" : main.toPar !== undefined ? formatToPar(main.toPar) : "—"}
            </span>

            <PlaceholderArt
              label={`${player.name} portrait`}
              imageUrl={cutoutUrl(player.photoUrl)}
              tone="navy"
              ratio="3/4"
              className="h-[140px] w-[110px] shrink-0 bg-transparent"
              sizes="110px"
            />

            <div className="min-w-0 basis-full sm:basis-auto">
              <p className="font-display text-lg">{firstName}</p>
              <h2 className="-mt-1 break-words font-display text-3xl font-bold uppercase leading-none">{surname}</h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-primary-foreground/70">
                <CountryFlag code={player.countryCode} className="h-3 w-4" />
                {player.country}
              </p>
            </div>
          </div>

          <div className="text-sm text-primary-foreground/80 sm:ml-auto sm:text-right">
            {/* A no-return or withdrawal has no placing; the line below already says which. */}
            {main.noReturn || main.withdrawn ? null : <p className="font-bold">Position {positionLabel(main)}</p>}
            <p>{leadText}</p>
          </div>
        </div>

        <div className="p-5">
          <label className="relative mb-3 inline-flex items-center gap-2 rounded-full border border-surface-dark-foreground/30 px-4 py-2 text-sm font-bold uppercase tracking-wide text-surface-dark-foreground transition-colors hover:border-accent">
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
            <ScorecardGrid entry={activeEntry} competition={competition} />
          ) : (
            <p className="text-sm text-surface-dark-foreground/60">No scorecard yet for this competition.</p>
          )}

          {main.started ? (
            <div className="mt-8">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-surface-dark-foreground/50">Statistics</p>
              <PlayerStatPanel
                playerId={player.id}
                nettCategories={nettCategories}
                scratchCategories={scratchCategories}
                streakCategories={streakCategories}
                drivingCategories={drivingCategories}
                approachCategories={approachCategories}
                puttingCategories={puttingCategories}
                mainThru={main.thru}
                scratchThru={scratch?.thru ?? "-"}
              />
            </div>
          ) : null}

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
