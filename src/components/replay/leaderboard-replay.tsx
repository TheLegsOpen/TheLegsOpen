"use client";

import { useEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";

import { Container } from "@/components/shared/container";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFavorites } from "@/hooks/use-favorites";
import { isConcluded } from "@/lib/leaderboard";
import { allocateStrokes, stablefordPoints } from "@/lib/scoring";
import type { ChampionshipReplay } from "@/lib/data/championship-replay";
import type { Competition, CompetitionEntry, HoleScore } from "@/lib/data/scorecards";

const COMPETITIONS: { value: Competition; label: string }[] = [
  { value: "main", label: "Main" },
  { value: "stableford", label: "Stableford" },
  { value: "scratch", label: "Scratch" },
];

/** Minutes of round time per real second of playback -- a five-and-a-half hour round in about a
 * minute, which is slow enough for the board's own row-movement animation to read. */
const SPEED = 6;
const TICK_MS = 100;

/**
 * Rebuilds the standings as they stood at a given minute of the round, from the holes each player
 * had completed by then.
 *
 * Deliberately mirrors buildLeaderboardFromDocs (src/lib/data/scorecards.ts) field for field and
 * sort for sort, and returns its CompetitionEntry -- that is what lets the replay render the site's
 * real LeaderboardTable rather than an imitation of it. That module can't simply be called here: it
 * opens a Payload connection at import time, and this is a client component scrubbing through
 * hundreds of moments in the round. The scoring itself is the shared lib either way.
 */
function boardAt(replay: ChampionshipReplay, competition: Competition, minute: number): CompetitionEntry[] {
  const rows = replay.players.map((entry) => {
    const received = allocateStrokes(entry.handicap, replay.holeInfos);

    let holesCompleted = 0;
    let parPlayed = 0;
    let grossTotal = 0;
    let nettTotal = 0;
    let stablefordTotal = 0;
    let anyNoReturn = false;

    const holes: HoleScore[] = replay.holeInfos.map((info, i) => {
      const hole = entry.holes[i];
      const holeNumber = i + 1;
      const reached = hole.at <= minute;

      if (!reached || (hole.strokes == null && !hole.noReturn)) {
        return { holeNumber, par: info.par, value: undefined, relative: 0 };
      }
      if (hole.noReturn) {
        // A pickup: out of gross and nett entirely (and out of par played, so the to-par figure
        // stays honest), but still worth zero Stableford points rather than nothing at all.
        holesCompleted += 1;
        anyNoReturn = true;
        if (competition === "stableford") return { holeNumber, par: info.par, value: 0, relative: -2 };
        return { holeNumber, par: info.par, value: undefined, relative: 0, noReturn: true };
      }

      const strokes = hole.strokes as number;
      holesCompleted += 1;
      parPlayed += info.par;
      grossTotal += strokes;
      const nett = strokes - received[i];
      nettTotal += nett;
      const points = stablefordPoints(nett, info.par);
      stablefordTotal += points;

      if (competition === "scratch") return { holeNumber, par: info.par, value: strokes, relative: strokes - info.par };
      if (competition === "main") return { holeNumber, par: info.par, value: nett, relative: nett - info.par };
      return { holeNumber, par: info.par, value: points, relative: points - 2 };
    });

    const started = holesCompleted > 0;
    const finished = holesCompleted >= 18;
    const thru = started ? (finished ? "F" : String(holesCompleted)) : "-";
    const noReturn = competition !== "stableford" && anyNoReturn;
    const toParGross = grossTotal - parPlayed;
    const toParNett = nettTotal - parPlayed;

    const base = {
      player: entry.player,
      holesCompleted,
      started,
      thru,
      teeTime: entry.teeTime,
      teeTimeMinutes: entry.teeTimeMinutes,
      holes,
      noReturn,
    };

    if (competition === "stableford") {
      return {
        ...base,
        score: stablefordTotal,
        // The Main nett-to-par, shown for reference -- and meaningless once Main is disqualified.
        toPar: anyNoReturn ? undefined : started ? toParNett : 0,
        tieKey: -stablefordTotal,
      };
    }
    const total = competition === "main" ? nettTotal : grossTotal;
    const toPar = competition === "main" ? toParNett : toParGross;
    return {
      ...base,
      score: noReturn ? undefined : finished ? total : undefined,
      toPar: noReturn ? undefined : started ? toPar : 0,
      tieKey: noReturn ? Number.POSITIVE_INFINITY : toPar,
    };
  });

  rows.sort((a, b) => {
    if (a.tieKey !== b.tieKey) return a.tieKey - b.tieKey;
    if (a.holesCompleted !== b.holesCompleted) return b.holesCompleted - a.holesCompleted;
    return a.teeTimeMinutes - b.teeTimeMinutes;
  });

  const entries: CompetitionEntry[] = [];
  let position = 0;
  let previousGroupKey: string | undefined;

  rows.forEach((row, index) => {
    const groupKey = String(row.tieKey);
    if (groupKey !== previousGroupKey) position = index + 1;
    entries.push({
      position,
      // Each no-return is individually disqualified, not level with the others sharing the sentinel.
      tied: !row.noReturn && rows.filter((r) => String(r.tieKey) === groupKey).length > 1,
      player: row.player,
      score: row.score,
      toPar: row.toPar,
      started: row.started,
      thru: row.thru,
      teeTime: row.teeTime,
      holes: row.holes,
      noReturn: row.noReturn,
    });
    previousGroupKey = groupKey;
  });

  return entries;
}

/** The first tee time plus n minutes, as a clock label. */
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
  const { favorites, toggleFavorite } = useFavorites();

  const entries = useMemo(() => boardAt(replay, competition, minute), [replay, competition, minute]);

  // The Main champion never also takes the Stableford title -- the same rule the live leaderboard
  // applies, and it only comes into force once Main has actually concluded.
  const mainEntries = useMemo(
    () => (competition === "stableford" ? boardAt(replay, "main", minute) : undefined),
    [replay, competition, minute],
  );
  const mainChampionId =
    mainEntries && isConcluded(mainEntries) ? mainEntries.find((e) => e.position === 1 && !e.tied)?.player.id : undefined;

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setMinute((current) => {
        if (current >= replay.durationMinutes) {
          setPlaying(false);
          return replay.durationMinutes;
        }
        return Math.min(replay.durationMinutes, current + (SPEED * TICK_MS) / 1000);
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [playing, replay.durationMinutes]);

  const finished = minute >= replay.durationMinutes;

  return (
    <div className="bg-primary text-surface-dark-foreground">
      <Container className="flex flex-col gap-6 py-10 sm:py-14">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Tabs value={competition} onValueChange={(value) => setCompetition(value as Competition)}>
            <TabsList className="border border-surface-dark-foreground/15 bg-surface-dark-foreground/10">
              {COMPETITIONS.map((c) => (
                <TabsTrigger
                  key={c.value}
                  value={c.value}
                  className="text-surface-dark-foreground data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-none"
                >
                  {c.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                if (finished) setMinute(0);
                setPlaying((p) => !p);
              }}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold uppercase tracking-wide text-accent-foreground transition-opacity hover:opacity-90"
            >
              {playing ? <Pause className="h-4 w-4" /> : finished ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {playing ? "Pause" : finished ? "Replay" : "Play"}
            </button>
            <div className="text-right">
              <p className="font-display text-2xl font-bold leading-none tabular-nums">
                {clockLabel(replay.firstTeeTime, minute)}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-surface-dark-foreground/60">
                {finished ? "Final" : `${Math.round(minute)} min in`}
              </p>
            </div>
          </div>
        </div>

        <input
          type="range"
          min={0}
          max={replay.durationMinutes}
          value={minute}
          onChange={(event) => {
            setPlaying(false);
            setMinute(Number(event.target.value));
          }}
          aria-label="Time through the round"
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-dark-foreground/20 accent-accent"
        />

        <LeaderboardTable
          entries={entries}
          competition={competition}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          favoritesOnly={false}
          onSelectPlayer={() => {}}
          excludeFromTitle={mainChampionId}
        />

        <p className="text-xs text-surface-dark-foreground/60">
          Reconstructed from the tee sheet and the card of each player, allowing 10 minutes for a par 3, 13 for a par 4
          and 15 for a par 5. Hole-by-hole times were never recorded, so the order holes were completed in is exact but
          a given minute is an estimate.
        </p>
      </Container>
    </div>
  );
}
