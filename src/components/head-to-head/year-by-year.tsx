"use client";

import { Fragment, useState } from "react";
import { ChevronDown } from "lucide-react";

import type { HoleOutcome, MatchPlayCard } from "@/lib/match-play";
import { cn, ordinal, splitSurnameFirst } from "@/lib/utils";

/**
 * The two players in the design system's two brand colours: the first in deep navy, the second in
 * the leaderboard's orange -- the champion row's gold at 90% over the navy page (accent/90 on
 * #06051E), which reads as a deeper amber than plain gold on white. Navy text on it, as everywhere
 * gold is a fill. Halved holes are white with the site's border.
 */
const LEADERBOARD_ORANGE = "bg-[#E6A803]";
const PLAYER = {
  a: { fill: "bg-primary text-primary-foreground", bar: "bg-primary" },
  b: { fill: `${LEADERBOARD_ORANGE} text-accent-foreground`, bar: LEADERBOARD_ORANGE },
} as const;

export interface YearRow {
  year: number;
  venue?: string;
  /** "3rd (+4)" and the like, already formatted on the server. */
  finishA: string;
  finishB: string;
  toParA?: string;
  toParB?: string;
  ahead?: "a" | "b" | "level";
  match?: MatchPlayCard;
}

/**
 * The Year by year table's rows. A year both played with hole-by-hole cards has its match play
 * result as a button that opens the match underneath: who won, by how much, and every hole coloured
 * by who took it -- theopen.com's (and the LPGA's) match card.
 */
export function YearByYearRows({ rows, nameA, nameB }: { rows: YearRow[]; nameA: string; nameB: string }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <tbody>
      {rows.map((row) => {
        const isOpen = open === row.year;
        const outcome = row.match?.result.outcome;
        return (
          <Fragment key={row.year}>
            <tr className={cn("border-b border-border", isOpen && "border-b-0")}>
              <td className="px-3 py-2 tabular-nums">{row.year}</td>
              <td className="px-3 py-2">{row.venue}</td>
              <td className={cn("px-3 py-2 text-center tabular-nums", row.ahead === "a" && "bg-accent/30 font-bold")}>
                {row.finishA}
                {row.toParA ? <span className="ml-1 text-xs text-muted-foreground">({row.toParA})</span> : null}
              </td>
              <td className={cn("px-3 py-2 text-center tabular-nums", row.ahead === "b" && "bg-accent/30 font-bold")}>
                {row.finishB}
                {row.toParB ? <span className="ml-1 text-xs text-muted-foreground">({row.toParB})</span> : null}
              </td>
              <td className="px-3 py-2 text-right">
                {row.match ? (
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : row.year)}
                    aria-expanded={isOpen}
                    aria-controls={`match-${row.year}`}
                    className="inline-flex items-center gap-1.5 whitespace-nowrap font-bold tabular-nums"
                  >
                    {/* A pill in the winner's colour, as the score on the card it opens. */}
                    <span
                      className={cn(
                        "px-2 py-0.5",
                        outcome === "won" ? PLAYER.a.fill : outcome === "lost" ? PLAYER.b.fill : "border border-border text-muted-foreground",
                      )}
                    >
                      {row.match.result.label}
                    </span>
                    <ChevronDown className={cn("h-4 w-4 text-primary transition-transform", isOpen && "rotate-180")} aria-hidden="true" />
                  </button>
                ) : (
                  <span className="text-border">—</span>
                )}
              </td>
            </tr>
            {isOpen && row.match ? (
              <tr id={`match-${row.year}`} className="border-b border-border">
                <td colSpan={5} className="px-0 pb-5 pt-1 sm:px-3">
                  {/* Below md the table is wider than the screen and scrolls sideways; the card is
                      held to the screen's width and pinned to its left edge, so it is never cut off. */}
                  <div className="sticky left-0 w-[calc(100vw-2.5rem)] md:static md:w-auto">
                    <MatchCard match={row.match} year={row.year} venue={row.venue} nameA={nameA} nameB={nameB} />
                  </div>
                </td>
              </tr>
            ) : null}
          </Fragment>
        );
      })}
    </tbody>
  );
}

function MatchCard({ match, year, venue, nameA, nameB }: { match: MatchPlayCard; year: number; venue?: string; nameA: string; nameB: string }) {
  const { outcome, label } = match.result;
  const score = label.replace(/^(Won|Lost) /, "");
  return (
    <div className="overflow-hidden border border-border bg-white">
      <div className="grid min-h-[120px] grid-cols-[1fr_auto_1fr] sm:min-h-[140px]">
        <Side name={nameA} player="a" winner={outcome === "won"} side="left" />
        <div className="flex flex-col items-center justify-center px-2 py-3 text-center sm:px-6">
          <p className="text-[12px] text-muted-foreground sm:text-[14px]">
            {year}
            {venue ? <span className="hidden sm:inline"> · {venue}</span> : null}
          </p>
          <p className="font-sans text-[13px] font-bold uppercase tracking-[1.2px] text-primary sm:text-[16px]">
            {match.decidedOn ? `On the ${ordinal(match.decidedOn)}` : "Final"}
          </p>
          {/* On a block of the winner's colour rather than as coloured text: gold text on white is
              too faint to read, gold behind navy text is how the site uses gold everywhere. */}
          <p
            className={cn(
              "mt-1 px-2.5 pb-0.5 pt-1.5 font-menu text-[30px] font-bold uppercase leading-none tabular-nums sm:px-3 sm:text-[44px]",
              outcome === "won" ? PLAYER.a.fill : outcome === "lost" ? PLAYER.b.fill : "text-muted-foreground",
            )}
          >
            {score}
          </p>
        </div>
        <Side name={nameB} player="b" winner={outcome === "lost"} side="right" />
      </div>
      <div className="border-t border-border bg-secondary px-3 py-4 sm:px-8">
        <ol className="mx-auto grid max-w-[460px] grid-cols-9 gap-1.5 sm:gap-2" aria-label="Hole by hole">
          {match.holes.map((hole, i) => (
            <li key={i} className={cn("flex aspect-square items-center justify-center font-menu text-[13px] tabular-nums sm:text-[16px]", HOLE_CLASS[hole])}>
              <span className="sr-only">{holeText(hole, i + 1, nameA, nameB)}</span>
              <span aria-hidden="true">{i + 1}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 font-menu text-[11px] uppercase tracking-[1.6px] text-muted-foreground">
          <Legend swatch={PLAYER.a.bar} text={`${splitSurnameFirst(nameA).surname} won`} />
          <Legend swatch={PLAYER.b.bar} text={`${splitSurnameFirst(nameB).surname} won`} />
          <Legend swatch="border border-border bg-white" text="Halved" />
        </p>
      </div>
    </div>
  );
}

/** A player's end of the card: the winner's on an arrow of their colour pointing at the score, the other plain with a bar of theirs at the edge. */
function Side({ name, player, winner, side }: { name: string; player: "a" | "b"; winner: boolean; side: "left" | "right" }) {
  const { firstName, surname } = splitSurnameFirst(name);
  return (
    <div
      className={cn("relative flex items-center px-3 sm:px-6", side === "left" ? "justify-start text-left" : "justify-end text-right", winner ? PLAYER[player].fill : "text-primary")}
      style={winner ? { clipPath: side === "left" ? "polygon(0 0, 82% 0, 100% 50%, 82% 100%, 0 100%)" : "polygon(18% 0, 100% 0, 100% 100%, 18% 100%, 0 50%)" } : undefined}
    >
      {winner ? null : <span className={cn("absolute inset-y-0 w-1.5", side === "left" ? "left-0" : "right-0", PLAYER[player].bar)} aria-hidden="true" />}
      <p className={cn("font-menu uppercase leading-tight", side === "left" ? "pr-4 sm:pr-8" : "pl-4 sm:pl-8")}>
        <span className="block text-[14px] sm:text-[20px]">{firstName}</span>
        <span className="block text-[16px] font-bold sm:text-[24px]">{surname}</span>
      </p>
    </div>
  );
}

/** Square tiles, like the scorecard cells in the leaderboard pop-up. */
const HOLE_CLASS: Record<HoleOutcome, string> = {
  won: PLAYER.a.fill,
  lost: PLAYER.b.fill,
  halved: "border border-border bg-white text-primary",
  unplayed: "border border-dashed border-border text-muted-foreground/50",
};

function holeText(hole: HoleOutcome, n: number, nameA: string, nameB: string): string {
  if (hole === "won") return `Hole ${n}: ${nameA} won`;
  if (hole === "lost") return `Hole ${n}: ${nameB} won`;
  if (hole === "halved") return `Hole ${n}: halved`;
  return `Hole ${n}: not played, match already decided`;
}

function Legend({ swatch, text }: { swatch: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-2.5 w-2.5", swatch)} aria-hidden="true" />
      {text}
    </span>
  );
}
