"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatToPar, holeScoreClass, synthesizeHoleScores, synthesizeMovement } from "@/lib/leaderboard";
import { cn, playerSlug } from "@/lib/utils";
import type { LeaderboardEntry } from "@/types/player";
import type { StatCategory } from "@/lib/statistics";
import type { Article } from "@/types/article";

interface PlayerPopupProps {
  entry: LeaderboardEntry | undefined;
  leaderScoreToPar: number;
  statCategories: StatCategory[];
  articles: Article[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlayerPopup({ entry, leaderScoreToPar, statCategories, articles, open, onOpenChange }: PlayerPopupProps) {
  if (!entry) return null;
  const { player } = entry;

  const movement = synthesizeMovement(`${player.id}-${entry.position}`);
  const shotsOffLead = entry.scoreToPar - leaderScoreToPar;
  const movementText =
    movement > 0 ? `Up ${movement} place${movement === 1 ? "" : "s"} today.` : movement < 0 ? `Down ${Math.abs(movement)} place${Math.abs(movement) === 1 ? "" : "s"} today.` : "Unchanged today.";
  const leadText = shotsOffLead === 0 ? "Leading the championship." : `${shotsOffLead} shot${shotsOffLead === 1 ? "" : "s"} off the lead.`;

  const [firstName, ...rest] = player.name.split(" ");
  const surname = rest.join(" ");
  const latestRoundIndex = entry.rounds.length - 1;

  const playerStats = statCategories
    .map((category) => {
      const rowIndex = category.rows.findIndex((row) => row.player.id === player.id);
      if (rowIndex === -1) return null;
      return { category, rank: rowIndex + 1, display: category.rows[rowIndex].display };
    })
    .filter((s): s is { category: StatCategory; rank: number; display: string } => s !== null);

  const relatedArticles = articles.slice(0, 3);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-full max-w-2xl overflow-y-auto p-0">
        <DialogTitle className="sr-only">{player.name}</DialogTitle>

        <div className="flex flex-col gap-4 bg-primary p-6 text-primary-foreground sm:flex-row sm:items-center">
          <span
            className={cn(
              "inline-flex h-12 w-14 shrink-0 items-center justify-center rounded font-display text-xl font-bold tabular-nums",
              entry.scoreToPar < 0 ? "bg-destructive text-white" : "bg-primary-foreground/15",
            )}
          >
            {formatToPar(entry.scoreToPar)}
          </span>
          <div>
            <p className="font-display text-lg">{firstName}</p>
            <h2 className="-mt-1 font-display text-3xl font-bold uppercase">{surname}</h2>
            <p className="text-sm text-primary-foreground/70">
              {player.country}
              {player.isAmateur ? " · Amateur" : ""}
            </p>
          </div>
          <div className="text-sm text-primary-foreground/80 sm:ml-auto sm:text-right">
            <p>
              {entry.tied ? "T" : ""}
              {entry.position} · {movementText}
            </p>
            <p>{leadText}</p>
          </div>
        </div>

        <div className="p-6">
          <Tabs defaultValue="scores">
            <TabsList>
              <TabsTrigger value="scores">Scores</TabsTrigger>
              <TabsTrigger value="news">Latest News</TabsTrigger>
              <TabsTrigger value="statistics">Statistics</TabsTrigger>
            </TabsList>

            <TabsContent value="scores" className="flex flex-col gap-6 pt-6">
              <div className="overflow-x-auto border border-border">
                <table className="w-full min-w-[360px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-2">Round</th>
                      <th className="px-4 py-2 text-right">Strokes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entry.rounds.map((strokes, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="px-4 py-2 font-medium">Round {i + 1}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{strokes}</td>
                      </tr>
                    ))}
                    <tr className="bg-secondary font-semibold">
                      <td className="px-4 py-2">Total</td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {entry.total} ({formatToPar(entry.scoreToPar)})
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Hole by hole, Round {latestRoundIndex + 1}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {synthesizeHoleScores(entry.rounds[latestRoundIndex] - 72, `${player.id}-${latestRoundIndex + 1}`).map(
                    (score, holeIndex) => (
                      <span
                        key={holeIndex}
                        title={`Hole ${holeIndex + 1}: ${formatToPar(score)}`}
                        className={cn("h-4 w-4", holeScoreClass(score))}
                      />
                    ),
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="news" className="flex flex-col gap-4 pt-6">
              {relatedArticles.length === 0 ? (
                <p className="text-sm text-muted-foreground">No news right now.</p>
              ) : (
                relatedArticles.map((article) => (
                  <Link
                    key={article.slug}
                    href={`/latest/${article.slug}`}
                    className="group flex flex-col gap-1 border-b border-border pb-4 last:border-0"
                  >
                    <span className="text-xs font-semibold uppercase tracking-wide text-accent">{article.category}</span>
                    <span className="font-display text-base font-bold group-hover:underline">{article.title}</span>
                    <span className="text-sm text-muted-foreground">{article.dek}</span>
                  </Link>
                ))
              )}
            </TabsContent>

            <TabsContent value="statistics" className="pt-6">
              {playerStats.length === 0 ? (
                <p className="text-sm text-muted-foreground">No statistics recorded for {player.name} yet.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border border-y border-border">
                  {playerStats.map(({ category, rank, display }) => (
                    <li key={category.key} className="flex items-center justify-between gap-4 px-1 py-3 text-sm">
                      <span className="font-medium">{category.title}</span>
                      <span className="flex items-center gap-3">
                        <span className="tabular-nums">{display}</span>
                        <span className="text-xs text-muted-foreground">Rank {rank}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>

          <Link
            href={`/players/${playerSlug(player)}`}
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-primary hover:text-accent"
          >
            Full player bio <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
