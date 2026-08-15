"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatToPar } from "@/lib/leaderboard";
import type { CompetitionEntry } from "@/lib/data/scorecards";

export interface ScoreboardData {
  main: CompetitionEntry[];
  stableford: CompetitionEntry[];
  scratch: CompetitionEntry[];
}

function Table({ entries, scoreLabel }: { entries: CompetitionEntry[]; scoreLabel: (e: CompetitionEntry) => string }) {
  if (entries.length === 0) {
    return <p className="py-10 text-center text-sm text-primary-foreground/60">No scores yet.</p>;
  }
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-primary-foreground/15 text-left text-xs uppercase tracking-wide text-primary-foreground/60">
          <th className="px-2 py-2">Pos</th>
          <th className="px-2 py-2">Player</th>
          <th className="px-2 py-2 text-right">Thru</th>
          <th className="px-2 py-2 text-right">Score</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e) => (
          <tr key={e.player.id} className="border-b border-primary-foreground/10 last:border-0">
            <td className="px-2 py-2 tabular-nums">
              {e.tied ? "T" : ""}
              {e.position}
            </td>
            <td className="px-2 py-2 font-semibold">{e.player.name}</td>
            <td className="px-2 py-2 text-right tabular-nums text-primary-foreground/70">{e.thru}</td>
            <td className="px-2 py-2 text-right font-bold tabular-nums">{scoreLabel(e)}</td>
          </tr>
        ))}
      </tbody>
    </table>
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
        <Table entries={data.main} scoreLabel={(e) => (e.noReturn ? "NR" : e.toPar !== undefined ? formatToPar(e.toPar) : "-")} />
      </TabsContent>
      <TabsContent value="stableford" className="mt-4">
        <Table entries={data.stableford} scoreLabel={(e) => (e.score !== undefined ? `${e.score} pts` : "-")} />
      </TabsContent>
      <TabsContent value="scratch" className="mt-4">
        <Table entries={data.scratch} scoreLabel={(e) => (e.noReturn ? "NR" : e.toPar !== undefined ? formatToPar(e.toPar) : "-")} />
      </TabsContent>
    </Tabs>
  );
}
