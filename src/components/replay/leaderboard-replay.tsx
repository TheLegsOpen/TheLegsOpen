"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { CountryFlag } from "@/components/shared/country-flag";
import { allocateStrokes, stablefordPoints } from "@/lib/scoring";
import { cn, splitSurnameFirst } from "@/lib/utils";
import type { ChampionshipReplay } from "@/lib/data/championship-replay";

type Competition = "main" | "stableford" | "scratch";

const COMPETITIONS: { value: Competition; label: string }[] = [
  { value: "main", label: "Main (Nett)" },
  { value: "stableford", label: "Stableford" },
  { value: "scratch", label: "Scratch" },
];

/** Minutes of round time advanced per real second while playing. The whole round in about a minute. */
const SPEED = 240;

/** How far back "moved up/down" looks. A quarter hour of play is roughly a hole, so an arrow means
 * a player has genuinely gained or lost ground rather than flickering on every tick. */
const MOVEMENT_WINDOW = 15;

interface Row {
  id: string;
  name: string;
  countryCode?: string;
  thru: number;
  noReturn: boolean;
  value: number;
  display: string;
  sortKey: number;
  position: number;
  tied: boolean;
  movement: number;
}

/**
 * Rebuilds the standings as they stood at a given minute of the round, from the holes each player
 * had completed by then. Mirrors buildLeaderboardFromDocs: a pick-up disqualifies Main and Scratch
 * but never Stableford, which keeps scoring from the rest of the card.
 */
function boardAt(replay: ChampionshipReplay, competition: Competition, minute: number): Row[] {
  const rows = replay.players.map((player) => {
    const received = allocateStrokes(player.handicap, replay.holeInfos);
    let gross = 0;
    let nett = 0;
    let points = 0;
    let thru = 0;
    let noReturn = false;
    let parPlayed = 0;

    player.holes.forEach((hole, i) => {
      if (hole.at > minute) return;
      if (hole.noReturn) {
        noReturn = true;
        thru += 1;
        parPlayed += replay.holeInfos[i].par;
        return;
      }
      if (hole.strokes == null) return;
      thru += 1;
      parPlayed += replay.holeInfos[i].par;
      gross += hole.strokes;
      const holeNett = hole.strokes - received[i];
      nett += holeNett;
      points += stablefordPoints(holeNett, replay.holeInfos[i].par);
    });

    const out = (() => {
      if (competition === "stableford") {
        return { value: points, display: thru === 0 ? "-" : String(points), sortKey: -points };
      }
      const total = competition === "main" ? nett : gross;
      const toPar = total - parPlayed;
      if (thru === 0) return { value: 0, display: "-", sortKey: Number.POSITIVE_INFINITY };
      if (noReturn) return { value: 0, display: "NR", sortKey: Number.POSITIVE_INFINITY };
      return { value: toPar, display: toPar === 0 ? "E" : toPar > 0 ? `+${toPar}` : String(toPar), sortKey: toPar };
    })();

    return {
      id: player.id,
      name: player.name,
      countryCode: player.countryCode,
      thru,
      noReturn: competition !== "stableford" && noReturn,
      ...out,
      position: 0,
      tied: false,
      movement: 0,
    } as Row;
  });

  rows.sort((a, b) => a.sortKey - b.sortKey || a.name.localeCompare(b.name));

  let position = 0;
  let lastKey: number | undefined;
  rows.forEach((row, i) => {
    if (row.sortKey !== lastKey) {
      position = i + 1;
      lastKey = row.sortKey;
    }
    row.position = position;
    row.tied = rows.filter((r) => r.sortKey === row.sortKey).length > 1 && Number.isFinite(row.sortKey);
  });

  return rows;
}

/** "10.00" plus n minutes, as a clock label. */
function clockLabel(firstTeeTime: string, minute: number): string {
  const match = firstTeeTime.match(/(\d{1,2})[.:](\d{2})/);
  const baseHour = match ? Number(match[1]) : 10;
  const baseMinute = match ? Number(match[2]) : 0;
  // Tee sheets are written on a 12-hour clock; 1.05 means the afternoon.
  const hour24 = baseHour >= 1 && baseHour <= 6 ? baseHour + 12 : baseHour;
  const total = hour24 * 60 + baseMinute + Math.round(minute);
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function LeaderboardReplay({ replay }: { replay: ChampionshipReplay }) {
  const [minute, setMinute] = useState(replay.durationMinutes);
  const [competition, setCompetition] = useState<Competition>("main");
  const [playing, setPlaying] = useState(false);
  const rows = useMemo(() => boardAt(replay, competition, minute), [replay, competition, minute]);

  // Movement against the board a quarter of an hour earlier, rather than against the previous
  // render. Deterministic -- scrubbing to the same minute always shows the same arrows -- and it
  // measures something real about the round instead of an artefact of how the viewer got here.
  const earlier = useMemo(
    () => boardAt(replay, competition, Math.max(0, minute - MOVEMENT_WINDOW)),
    [replay, competition, minute],
  );
  const withMovement = useMemo(() => {
    const positionsEarlier = new Map(earlier.map((r) => [r.id, r.position]));
    return rows.map((row) => ({ ...row, movement: (positionsEarlier.get(row.id) ?? row.position) - row.position }));
  }, [rows, earlier]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setMinute((current) => {
        if (current >= replay.durationMinutes) {
          setPlaying(false);
          return replay.durationMinutes;
        }
        return Math.min(replay.durationMinutes, current + SPEED / 10);
      });
    }, 100);
    return () => clearInterval(id);
  }, [playing, replay.durationMinutes]);

  const anyStarted = rows.some((r) => r.thru > 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="accent"
          size="lg"
          className="uppercase tracking-wide"
          onClick={() => {
            if (minute >= replay.durationMinutes) setMinute(0);
            setPlaying((p) => !p);
          }}
        >
          {playing ? "Pause" : minute >= replay.durationMinutes ? "Replay round" : "Play"}
        </Button>
        <div className="flex flex-wrap gap-2">
          {COMPETITIONS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCompetition(c.value)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors",
                competition === c.value ? "border-accent bg-accent text-accent-foreground" : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="ml-auto text-right">
          <p className="font-display text-2xl font-bold tabular-nums">{clockLabel(replay.firstTeeTime, minute)}</p>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {minute >= replay.durationMinutes ? "Final" : `${Math.round(minute)} min in`}
          </p>
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={replay.durationMinutes}
        value={minute}
        onChange={(e) => {
          setPlaying(false);
          setMinute(Number(e.target.value));
        }}
        aria-label="Time through the round"
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-border accent-accent"
      />

      {!anyStarted ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Nobody has teed off yet.</p>
      ) : (
        <ol className="flex flex-col divide-y divide-border border border-border">
          {withMovement.map((row) => (
            <li key={row.id} className="flex items-center gap-4 px-4 py-2.5">
              <span className="w-10 shrink-0 font-display text-lg font-bold tabular-nums">
                {row.thru === 0 ? "-" : row.noReturn ? "" : `${row.tied ? "T" : ""}${row.position}`}
              </span>
              <span className="w-5 shrink-0 text-center text-xs tabular-nums">
                {row.movement > 0 ? <span className="text-emerald-600">▲{row.movement}</span> : row.movement < 0 ? <span className="text-destructive">▼{-row.movement}</span> : null}
              </span>
              <CountryFlag code={row.countryCode ?? ""} className="h-3 w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate font-display text-base">
                <span className="font-bold">{splitSurnameFirst(row.name).surname}</span>
                <span className="font-normal">, {splitSurnameFirst(row.name).firstName}</span>
              </span>
              <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                {row.thru === 0 ? "-" : row.thru === 18 ? "F" : `thru ${row.thru}`}
              </span>
              <span className="w-14 shrink-0 text-right font-display text-lg font-bold tabular-nums">{row.display}</span>
            </li>
          ))}
        </ol>
      )}

      <p className="text-xs text-muted-foreground">
        Reconstructed from the tee sheet and the card of each player, allowing 10 minutes for a par 3, 13 for a par 4 and
        15 for a par 5. Hole-by-hole times were never recorded, so the order is exact but a given minute is an estimate.
      </p>
    </div>
  );
}
