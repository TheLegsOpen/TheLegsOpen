"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { TILE_CLASS, NEUTRAL_TILE_CLASS } from "@/components/leaderboard/leaderboard-table";
import { ScorecardGrid, type ScorecardEntry } from "@/components/players/scorecard-grid";
import { formatToPar } from "@/lib/leaderboard";
import { cn, formatDate } from "@/lib/utils";
import type { PlayerYearResult, PlayerCompetitionResult } from "@/lib/data/players";
import type { Competition } from "@/lib/data/scorecards";

type Mode = "tournament" | "course";

const COMPETITION_OPTIONS: { value: Competition; label: string }[] = [
  { value: "main", label: "Main scorecard" },
  { value: "stableford", label: "Stableford scorecard" },
  { value: "scratch", label: "Scratch scorecard" },
];

function toEntry(result: PlayerCompetitionResult | undefined): ScorecardEntry | undefined {
  if (!result?.holes) return undefined;
  return { holes: result.holes, score: result.score };
}

function FinishTile({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      <span className={cn(TILE_CLASS, "min-w-[3rem]", NEUTRAL_TILE_CLASS)}>{value}</span>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

function PosCell({ result }: { result: PlayerCompetitionResult | undefined }) {
  if (!result) return <td className="px-3 py-3 text-center text-muted-foreground">—</td>;
  if (result.noReturn) return <td className="px-3 py-3 text-center font-bold text-destructive">NR</td>;
  return (
    <td className="px-3 py-3 text-center font-bold tabular-nums">
      {result.tied ? "T" : ""}
      {result.position}
    </td>
  );
}

function ScoreCell({ result }: { result: PlayerCompetitionResult | undefined }) {
  return <td className="px-3 py-3 text-center tabular-nums">{result?.noReturn ? "—" : (result?.score ?? "—")}</td>;
}

function ToParCell({ result }: { result: PlayerCompetitionResult | undefined }) {
  return <td className="px-3 py-3 text-center tabular-nums">{result?.noReturn || result?.toPar === undefined ? "—" : formatToPar(result.toPar)}</td>;
}

export function ResultsTab({ results }: { results: PlayerYearResult[] }) {
  const [mode, setMode] = useState<Mode>("tournament");
  const [selectedVenueSlug, setSelectedVenueSlug] = useState<string | undefined>(undefined);
  const [expandedYear, setExpandedYear] = useState<number | null>(null);
  const [expandedCompetition, setExpandedCompetition] = useState<Competition>("main");

  const venues = useMemo(() => {
    const seen = new Map<string, string>();
    // results is newest-first, so the first sighting of each venue is its most recent edition --
    // that's what "select a course, land on the latest year" below relies on.
    for (const r of results) if (!seen.has(r.venueSlug)) seen.set(r.venueSlug, r.venueName);
    return Array.from(seen, ([venueSlug, venueName]) => ({ venueSlug, venueName }));
  }, [results]);

  const rows = mode === "tournament" ? results : results.filter((r) => r.venueSlug === selectedVenueSlug);

  const finishes = useMemo(() => {
    let wins = 0;
    let second = 0;
    let third = 0;
    let top5 = 0;
    let top10 = 0;
    let top25 = 0;
    let nrs = 0;
    for (const r of rows) {
      if (r.finish === "Winner") wins += 1;
      if (r.position === 2) second += 1;
      if (r.position === 3) third += 1;
      if (r.position <= 5) top5 += 1;
      if (r.position <= 10) top10 += 1;
      if (r.position <= 25) top25 += 1;
      if (r.main.noReturn) nrs += 1;
    }
    return { wins, second, third, top5, top10, top25, nrs };
  }, [rows]);

  function selectCourseMode() {
    setMode("course");
    // venues is newest-first, so the most recent course a player has played is the sane default --
    // never lands on an empty view.
    setSelectedVenueSlug((prev) => prev ?? venues[0]?.venueSlug);
    setExpandedYear(null);
  }

  function selectTournament() {
    setMode("tournament");
    setExpandedYear(null);
  }

  function toggleRow(row: PlayerYearResult) {
    if (!row.hasScorecards) return;
    if (expandedYear === row.year) {
      setExpandedYear(null);
      return;
    }
    setExpandedYear(row.year);
    setExpandedCompetition("main");
  }

  if (results.length === 0) {
    return <p className="text-muted-foreground">No previous appearances at the Legs Open on record.</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={selectTournament}
            className={cn(
              "rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors",
              mode === "tournament" ? "border-accent bg-accent text-accent-foreground" : "border-border text-muted-foreground hover:border-accent hover:text-accent",
            )}
          >
            Tournament
          </button>
          <button
            type="button"
            onClick={selectCourseMode}
            disabled={venues.length === 0}
            className={cn(
              "rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors",
              mode === "course"
                ? "border-accent bg-accent text-accent-foreground"
                : "border-border text-muted-foreground hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-muted-foreground",
            )}
          >
            Course
          </button>
        </div>

        {mode === "course" ? (
          <label className="relative inline-flex w-fit items-center gap-2 rounded-full border border-border px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-foreground">
            <span className="sr-only">Select course</span>
            <select
              value={selectedVenueSlug}
              onChange={(e) => {
                setSelectedVenueSlug(e.target.value);
                setExpandedYear(null);
              }}
              className="cursor-pointer appearance-none bg-transparent pr-5 focus:outline-none"
            >
              {venues.map((v) => (
                <option key={v.venueSlug} value={v.venueSlug}>
                  {v.venueName.toUpperCase()}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 h-4 w-4" />
          </label>
        ) : null}
      </div>

      <div>
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Finishes</p>
        <div className="flex flex-wrap gap-6 border border-border p-4">
          <FinishTile value={finishes.wins} label="Wins" />
          <FinishTile value={finishes.second} label="2nd" />
          <FinishTile value={finishes.third} label="3rd" />
          <FinishTile value={finishes.top5} label="Top 5" />
          <FinishTile value={finishes.top10} label="Top 10" />
          <FinishTile value={finishes.top25} label="Top 25" />
          <FinishTile value={finishes.nrs} label="NRs" />
        </div>
      </div>

      <div>
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Results &amp; Scorecard</p>
        <div className="no-scrollbar overflow-x-auto border border-border">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary text-center text-xs uppercase tracking-wide text-muted-foreground">
                <th rowSpan={2} className="border-r border-border px-4 py-3 text-left align-bottom">
                  Date
                </th>
                <th rowSpan={2} className="border-r border-border px-4 py-3 text-left align-bottom">
                  Venue
                </th>
                <th colSpan={3} className="border-r border-border px-3 py-2">
                  Main Competition
                </th>
                <th colSpan={2} className="border-r border-border px-3 py-2">
                  Stableford
                </th>
                <th colSpan={2} className="px-3 py-2">
                  Scratch
                </th>
              </tr>
              <tr className="border-b border-border bg-secondary text-center text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2">Pos</th>
                <th className="px-3 py-2">Score</th>
                <th className="border-r border-border px-3 py-2">To Par</th>
                <th className="px-3 py-2">Pos</th>
                <th className="border-r border-border px-3 py-2">Score</th>
                <th className="px-3 py-2">Pos</th>
                <th className="px-3 py-2">Score</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <Fragment key={row.year}>
                  <tr
                    onClick={() => toggleRow(row)}
                    className={cn(
                      "border-b border-border last:border-0",
                      row.hasScorecards && "cursor-pointer hover:bg-secondary/60",
                      row.finish === "Winner" && "bg-accent/10",
                    )}
                  >
                    <td className="px-4 py-3 font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        {row.hasScorecards ? (
                          <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", expandedYear === row.year && "rotate-180")} />
                        ) : null}
                        {row.date ? formatDate(row.date) : row.year}
                      </span>
                    </td>
                    <td className="px-4 py-3">{row.venueName}</td>
                    <PosCell result={row.main} />
                    <ScoreCell result={row.main} />
                    <ToParCell result={row.main} />
                    <PosCell result={row.stableford} />
                    <ScoreCell result={row.stableford} />
                    <PosCell result={row.scratch} />
                    <ScoreCell result={row.scratch} />
                  </tr>
                  {expandedYear === row.year ? (
                    <tr className="border-b border-border bg-secondary/30 last:border-0">
                      <td colSpan={9} className="p-4">
                        <div className="flex flex-col gap-3">
                          <label className="relative inline-flex w-fit items-center gap-2 rounded-full border border-border px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-foreground">
                            <span className="sr-only">Select competition</span>
                            <select
                              value={expandedCompetition}
                              onChange={(e) => setExpandedCompetition(e.target.value as Competition)}
                              className="cursor-pointer appearance-none bg-transparent pr-5 focus:outline-none"
                            >
                              {COMPETITION_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label.toUpperCase()}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-4 h-4 w-4" />
                          </label>

                          {(() => {
                            const entry = toEntry(row[expandedCompetition]);
                            return entry ? (
                              <ScorecardGrid entry={entry} competition={expandedCompetition} />
                            ) : (
                              <p className="text-sm text-muted-foreground">No {expandedCompetition} scorecard for this competition.</p>
                            );
                          })()}

                          <Link href={`/previous-opens/${row.year}`} className="w-fit text-sm font-bold uppercase tracking-wide text-primary hover:underline">
                            View {row.year} Open
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
