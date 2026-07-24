import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { formatToPar } from "@/lib/leaderboard";
import type { LeaderboardEntry } from "@/types/player";

export function LeaderboardWidget({ entries: top }: { entries: LeaderboardEntry[] }) {
  return (
    <section className="bg-surface-dark bg-dashboard-pattern py-16 text-surface-dark-foreground sm:py-24">
      <Container className="flex flex-col gap-8">
        <div className="flex items-end justify-between gap-6">
          <SectionHeading tone="dark" eyebrow="Championship Week" title="Leaderboard" />
          <Link
            href="/leaderboard"
            className="hidden shrink-0 items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-accent transition-colors hover:text-accent/80 sm:flex"
          >
            Full leaderboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="overflow-x-auto border border-surface-dark-foreground/15">
          <table className="w-full min-w-[420px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-surface-dark-foreground/15 text-left text-xs uppercase tracking-wide text-surface-dark-foreground/50">
                <th className="px-4 py-3">Pos</th>
                <th className="px-2 py-3">Player</th>
                <th className="px-2 py-3 text-right">To Par</th>
                <th className="px-4 py-3 text-right">Thru</th>
              </tr>
            </thead>
            <tbody>
              {top.map((entry) => (
                <tr
                  key={entry.player.id}
                  className={
                    entry.position === 1 && !entry.tied
                      ? "bg-accent text-accent-foreground"
                      : "border-b border-surface-dark-foreground/15 last:border-0"
                  }
                >
                  <td className="px-4 py-3 font-medium tabular-nums">
                    {entry.tied ? "T" : ""}
                    {entry.position}
                  </td>
                  <td className="px-2 py-3 font-medium">
                    {entry.player.name} <span className="text-xs opacity-60">{entry.player.countryCode}</span>
                  </td>
                  <td className="px-2 py-3 text-right font-medium tabular-nums">{formatToPar(entry.scoreToPar)}</td>
                  <td className="px-4 py-3 text-right tabular-nums opacity-70">{entry.thru}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Link
          href="/leaderboard"
          className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-accent sm:hidden"
        >
          Full leaderboard
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Container>
    </section>
  );
}
