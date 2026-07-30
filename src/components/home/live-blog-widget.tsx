"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { CountryFlag } from "@/components/shared/country-flag";
import { formatToPar } from "@/lib/leaderboard";
import { cn, playerSlug } from "@/lib/utils";
import { CATEGORY_META, formatTime, formatDate } from "@/components/live-blog/live-blog-feed";
import { scorePillClass, TILE_CLASS, NEUTRAL_TILE_CLASS } from "@/components/leaderboard/leaderboard-table";
import type { LiveBlogEntry } from "@/lib/data/live-blog";

const WIDGET_POST_COUNT = 3;

interface LiveBlogWidgetProps {
  entries: LiveBlogEntry[];
}

export function LiveBlogWidget({ entries }: LiveBlogWidgetProps) {
  const top = entries.slice(0, WIDGET_POST_COUNT);

  return (
    <div className="border border-surface-dark-foreground/15">
      <div className="bg-primary px-5 py-3">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-primary-foreground">Live Blog</h2>
      </div>

      {top.length === 0 ? (
        <p className="bg-white p-5 text-sm text-black/60">Updates will appear here automatically as notable scores come in.</p>
      ) : (
        <div className="flex flex-col">
          {top.map((entry) => {
            const meta = CATEGORY_META[entry.category];
            const Icon = meta.icon;
            const isStableford = entry.competition === "stableford";
            return (
              <article key={entry.id} className="border-b border-black/10 bg-white p-4 last:border-0">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide", meta.chipClass)}>
                    <Icon className="h-3 w-3" />
                    {meta.label}
                  </span>
                  <span className="text-[11px] text-black/50 tabular-nums">
                    {formatTime(entry.postedAt)} · {formatDate(entry.postedAt)}
                  </span>
                </div>
                <h3 className="mb-1 font-display text-sm font-bold text-primary">{entry.headline}</h3>
                {entry.body ? <p className="mb-2 text-sm leading-relaxed text-black/70">{entry.body}</p> : null}
                <div className="flex items-center gap-3">
                  {entry.player ? (
                    <Link
                      href={`/players/${playerSlug(entry.player)}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
                    >
                      <CountryFlag code={entry.player.countryCode} className="h-3 w-4" />
                      {entry.player.name}
                    </Link>
                  ) : null}
                  {entry.scoreRelative !== undefined ? (
                    <span className={cn(TILE_CLASS, "text-[11px]", isStableford ? NEUTRAL_TILE_CLASS : scorePillClass(entry.scoreRelative))}>
                      {isStableford ? `${entry.scoreRelative} pts` : formatToPar(entry.scoreRelative)}
                    </span>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Link
        href="/live-blog"
        className="flex items-center justify-between bg-primary px-5 py-3 text-sm font-bold uppercase tracking-wide text-accent transition-colors hover:text-accent/80"
      >
        Full live blog
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
