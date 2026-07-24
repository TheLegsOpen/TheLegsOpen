"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { ChampionshipWinner } from "@/types/championship";

export function PreviousOpensTimeline({ history }: { history: ChampionshipWinner[] }) {
  const decades = useMemo(() => {
    const set = new Set(history.map((c) => Math.floor(c.year / 10) * 10));
    return Array.from(set).sort((a, b) => b - a);
  }, [history]);

  const [decade, setDecade] = useState<string>("all");

  const filtered =
    decade === "all" ? history : history.filter((c) => Math.floor(c.year / 10) * 10 === Number(decade));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <label htmlFor="decade-filter" className="text-sm font-medium text-muted-foreground">
          Select decade
        </label>
        <select
          id="decade-filter"
          value={decade}
          onChange={(event) => setDecade(event.target.value)}
          className="h-10 rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all">All decades</option>
          {decades.map((d) => (
            <option key={d} value={d}>
              {d}s
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">No championships recorded for that decade.</p>
      ) : (
        <div className="flex flex-col">
          {filtered.map((c) => (
            <div
              key={c.year}
              className="grid grid-cols-[64px_1fr] items-start gap-4 border-t border-border py-6 first:border-t-0 sm:grid-cols-[110px_1fr] sm:items-center sm:gap-8 sm:py-8"
            >
              <span className="font-display text-2xl font-bold text-muted-foreground sm:text-3xl">{c.year}</span>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{c.venueName}</p>
                  <p className="font-display text-xl font-bold">{c.winnerName}</p>
                </div>
                <Link
                  href={`/previous-opens/${c.year}`}
                  className="inline-flex w-fit items-center gap-1 text-sm font-bold uppercase tracking-wide text-primary transition-colors hover:text-accent"
                >
                  Info <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
