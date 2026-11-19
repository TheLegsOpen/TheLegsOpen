"use client";

import { Fragment, useState, type CSSProperties } from "react";
import { ChevronDown } from "lucide-react";

import type { HoleOutcome, MatchPlayCard } from "@/lib/match-play";
import { cn, ordinal, splitSurnameFirst } from "@/lib/utils";

/** The first player's colour and the second's, as in the rest of the head-to-head page. */
const A_COLOUR = "#2269AB";
const B_COLOUR = "#CB333B";

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
            <tr className={cn("border-b border-[#E3E6E8]", isOpen && "border-b-0")}>
              <td className="px-3 py-2 tabular-nums">{row.year}</td>
              <td className="px-3 py-2">{row.venue}</td>
              <td className={cn("px-3 py-2 text-center tabular-nums", row.ahead === "a" && "bg-accent/30 font-bold")}>
                {row.finishA}
                {row.toParA ? <span className="ml-1 text-xs text-[#43524E]">({row.toParA})</span> : null}
              </td>
              <td className={cn("px-3 py-2 text-center tabular-nums", row.ahead === "b" && "bg-accent/30 font-bold")}>
                {row.finishB}
                {row.toParB ? <span className="ml-1 text-xs text-[#43524E]">({row.toParB})</span> : null}
              </td>
              <td className="px-3 py-2 text-right">
                {row.match ? (
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : row.year)}
                    aria-expanded={isOpen}
                    aria-controls={`match-${row.year}`}
                    className={cn(
                      "inline-flex items-center gap-1 whitespace-nowrap font-bold tabular-nums underline-offset-4 hover:underline",
                      outcome === "won" && "text-[#2269AB]",
                      outcome === "lost" && "text-[#CB333B]",
                      outcome === "halved" && "text-[#43524E]",
                    )}
                  >
                    {row.match.result.label}
                    <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} aria-hidden="true" />
                  </button>
                ) : (
                  <span className="text-[#B9BEC0]">—</span>
                )}
              </td>
            </tr>
            {isOpen && row.match ? (
              <tr id={`match-${row.year}`} className="border-b border-[#E3E6E8]">
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
  const winnerColour = outcome === "won" ? A_COLOUR : outcome === "lost" ? B_COLOUR : "#43524E";
  return (
    <div className="overflow-hidden bg-white shadow-[0_1px_6px_rgba(6,5,30,0.12)]">
      <div className="grid min-h-[120px] grid-cols-[1fr_auto_1fr] sm:min-h-[140px]">
        <Side name={nameA} colour={A_COLOUR} winner={outcome === "won"} side="left" />
        <div className="flex flex-col items-center justify-center px-2 py-3 text-center sm:px-6">
          <p className="text-[12px] text-[#43524E] sm:text-[14px]">
            {year}
            {venue ? <span className="hidden sm:inline"> · {venue}</span> : null}
          </p>
          <p className="font-sans text-[13px] font-bold uppercase tracking-[1.2px] text-primary sm:text-[16px]">
            {match.decidedOn ? `On the ${ordinal(match.decidedOn)}` : "Final"}
          </p>
          <p className="font-menu text-[30px] font-bold uppercase leading-none tabular-nums sm:text-[44px]" style={{ color: winnerColour }}>
            {score}
          </p>
        </div>
        <Side name={nameB} colour={B_COLOUR} winner={outcome === "lost"} side="right" />
      </div>
      <div className="bg-[#F2F3F4] px-3 py-4 sm:px-8">
        <ol className="mx-auto grid max-w-[460px] grid-cols-9 gap-1.5 sm:gap-3" aria-label="Hole by hole">
          {match.holes.map((hole, i) => (
            <li key={i} className={cn("flex aspect-square items-center justify-center rounded-full font-menu text-[13px] tabular-nums sm:text-[16px]", HOLE_CLASS[hole])} style={HOLE_STYLE[hole]}>
              <span className="sr-only">{holeText(hole, i + 1, nameA, nameB)}</span>
              <span aria-hidden="true">{i + 1}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] uppercase tracking-[1px] text-[#43524E]">
          <Legend colour={A_COLOUR} text={`${splitSurnameFirst(nameA).surname} won`} />
          <Legend colour={B_COLOUR} text={`${splitSurnameFirst(nameB).surname} won`} />
          <Legend colour="#CDD2D6" text="Halved" />
        </p>
      </div>
    </div>
  );
}

/** A player's end of the card: the winner's on an arrow of their colour pointing at the score, the other plain with a bar of theirs at the edge. */
function Side({ name, colour, winner, side }: { name: string; colour: string; winner: boolean; side: "left" | "right" }) {
  const { firstName, surname } = splitSurnameFirst(name);
  return (
    <div
      className={cn("relative flex items-center px-3 sm:px-6", side === "left" ? "justify-start text-left" : "justify-end text-right", winner ? "text-white" : "text-primary")}
      style={
        winner
          ? { backgroundColor: colour, clipPath: side === "left" ? "polygon(0 0, 82% 0, 100% 50%, 82% 100%, 0 100%)" : "polygon(18% 0, 100% 0, 100% 100%, 18% 100%, 0 50%)" }
          : { boxShadow: `inset ${side === "left" ? "6px" : "-6px"} 0 0 ${colour}` }
      }
    >
      <p className={cn("font-menu uppercase leading-tight", side === "left" ? "pr-4 sm:pr-8" : "pl-4 sm:pl-8")}>
        <span className="block text-[14px] sm:text-[20px]">{firstName}</span>
        <span className="block text-[16px] font-bold sm:text-[24px]">{surname}</span>
      </p>
    </div>
  );
}

const HOLE_CLASS: Record<HoleOutcome, string> = {
  won: "text-white",
  lost: "text-white",
  halved: "bg-[#CDD2D6] text-primary",
  unplayed: "border border-dashed border-[#B9BEC0] text-[#B9BEC0]",
};
const HOLE_STYLE: Record<HoleOutcome, CSSProperties | undefined> = {
  won: { backgroundColor: A_COLOUR },
  lost: { backgroundColor: B_COLOUR },
  halved: undefined,
  unplayed: undefined,
};

function holeText(hole: HoleOutcome, n: number, nameA: string, nameB: string): string {
  if (hole === "won") return `Hole ${n}: ${nameA} won`;
  if (hole === "lost") return `Hole ${n}: ${nameB} won`;
  if (hole === "halved") return `Hole ${n}: halved`;
  return `Hole ${n}: not played, match already decided`;
}

function Legend({ colour, text }: { colour: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colour }} aria-hidden="true" />
      {text}
    </span>
  );
}
