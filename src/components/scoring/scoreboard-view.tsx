"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, splitSurnameFirst } from "@/lib/utils";
import { formatToPar } from "@/lib/leaderboard";
import type { CompetitionEntry } from "@/lib/data/scorecards";

export interface ScoreboardData {
  main: CompetitionEntry[];
  stableford: CompetitionEntry[];
  scratch: CompetitionEntry[];
}

// Mirrors the main site's leaderboard-table.tsx tile styling (flat, square-cornered, black/15
// top border) so this reads as the same leaderboard, just in the scoring app's own shell.
// Duplicated as literals rather than imported, to keep this offline-first bundle free of
// leaderboard-table's framer-motion/lucide-react dependencies.
const TILE_CLASS = "inline-block min-w-[2.75rem] px-2 py-1 text-xs font-bold tabular-nums border-t-[3px] border-black/15";
const NEUTRAL_TILE = "bg-[#FFD062] text-black";
const NR_TILE = "bg-white text-[#CB333B]";

function scorePillClass(relativeToPar: number): string {
  if (relativeToPar < 0) return "bg-white text-[#CB333B]";
  if (relativeToPar === 0) return "bg-[#0E3D2C] text-white";
  return "bg-white text-[#08325A]";
}

/** "REITH, Callum" -- same surname-first format and bold/normal weight split as the main site's leaderboard. */
function PlayerName({ name }: { name: string }) {
  const { surname, firstName } = splitSurnameFirst(name);
  return (
    <>
      <span className="font-bold">{surname}</span>
      <span className="font-normal">, {firstName}</span>
    </>
  );
}

function ScoreTile({ entry, label, colorByPar }: { entry: CompetitionEntry; label: string; colorByPar: boolean }) {
  if (entry.noReturn) {
    return <span className={cn(TILE_CLASS, NR_TILE)}>NR</span>;
  }
  const colorClass = colorByPar && entry.toPar !== undefined ? scorePillClass(entry.toPar) : NEUTRAL_TILE;
  return <span className={cn(TILE_CLASS, colorClass)}>{label}</span>;
}

function Table({
  entries,
  scoreLabel,
  colorByPar,
}: {
  entries: CompetitionEntry[];
  scoreLabel: (e: CompetitionEntry) => string;
  colorByPar: boolean;
}) {
  if (entries.length === 0) {
    return <p className="py-10 text-center text-sm text-primary-foreground/60">No scores yet.</p>;
  }
  return (
    <div className="overflow-x-auto border border-primary-foreground/15 bg-primary">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-primary-foreground/15 bg-primary-foreground/5 text-left text-xs uppercase tracking-wide text-primary-foreground/60">
            <th className="px-2 py-3">Pos</th>
            <th className="px-2 py-3">Player</th>
            <th className="px-2 py-3 text-right">Thru</th>
            <th className="px-2 py-3 text-right">Score</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.player.id} className="bg-accent/90 text-accent-foreground">
              <td className="px-2 py-3 font-bold tabular-nums">
                {e.tied ? "T" : ""}
                {e.position}
              </td>
              <td className="px-2 py-3">
                <PlayerName name={e.player.name} />
              </td>
              <td className="px-2 py-3 text-right">
                <span className={cn(TILE_CLASS, NEUTRAL_TILE)}>{e.thru}</span>
              </td>
              <td className="px-2 py-3 text-right">
                <ScoreTile entry={e} label={scoreLabel(e)} colorByPar={colorByPar} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ScoreboardView({ data }: { data: ScoreboardData }) {
  return (
    <Tabs defaultValue="main">
      <TabsList>
        <TabsTrigger value="main">Main</TabsTrigger>
        <TabsTrigger value="stableford">Stableford</TabsTrigger>
        <TabsTrigger value="scratch">Scratch</TabsTrigger>
      </TabsList>
      <TabsContent value="main" className="mt-4">
        <Table entries={data.main} scoreLabel={(e) => (e.toPar !== undefined ? formatToPar(e.toPar) : "-")} colorByPar />
      </TabsContent>
      <TabsContent value="stableford" className="mt-4">
        <Table entries={data.stableford} scoreLabel={(e) => (e.score !== undefined ? `${e.score} pts` : "-")} colorByPar={false} />
      </TabsContent>
      <TabsContent value="scratch" className="mt-4">
        <Table entries={data.scratch} scoreLabel={(e) => (e.toPar !== undefined ? formatToPar(e.toPar) : "-")} colorByPar />
      </TabsContent>
    </Tabs>
  );
}
