"use client";

import Link from "next/link";
import { ArrowDownCircle, ArrowUpCircle, Crown, Flag, Star, Trophy } from "lucide-react";

import { CountryFlag } from "@/components/shared/country-flag";
import { cn, playerSlug } from "@/lib/utils";
import type { LiveBlogCategory, LiveBlogEntry } from "@/lib/data/live-blog";

const CATEGORY_META: Record<LiveBlogCategory, { label: string; icon: typeof Star; chipClass: string }> = {
  eagle: { label: "Eagle", icon: Star, chipClass: "bg-[#910149] text-white" },
  birdie: { label: "Birdie", icon: ArrowDownCircle, chipClass: "bg-[#CB333B] text-white" },
  bogey: { label: "Bogey", icon: ArrowUpCircle, chipClass: "bg-[#08325A] text-white" },
  leader: { label: "Leader", icon: Crown, chipClass: "bg-[#0E3D2C] text-white" },
  "round-complete": { label: "Round complete", icon: Flag, chipClass: "bg-surface-dark-foreground/10 text-surface-dark-foreground" },
  championship: { label: "Championship", icon: Trophy, chipClass: "bg-accent text-accent-foreground" },
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

interface LiveBlogFeedProps {
  entries: LiveBlogEntry[];
}

export function LiveBlogFeed({ entries }: LiveBlogFeedProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-surface-dark-foreground/20 py-16 text-center">
        <p className="font-display font-bold text-lg">No updates yet</p>
        <p className="text-sm text-surface-dark-foreground/60">Posts will appear here automatically as notable scores come in.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {entries.map((entry) => {
        const meta = CATEGORY_META[entry.category];
        const Icon = meta.icon;
        return (
          <article key={entry.id} className="border border-surface-dark-foreground/15 bg-surface-dark-foreground/5 p-5">
            <div className="mb-3 flex items-center justify-between gap-4">
              <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase tracking-wide", meta.chipClass)}>
                <Icon className="h-3.5 w-3.5" />
                {meta.label}
              </span>
              <span className="text-xs text-surface-dark-foreground/50 tabular-nums">
                {formatTime(entry.postedAt)} · {formatDate(entry.postedAt)}
              </span>
            </div>
            <h3 className="mb-1.5 font-display text-lg font-bold">{entry.headline}</h3>
            <p className="text-base leading-relaxed text-surface-dark-foreground/80">{entry.body}</p>
            {entry.player ? (
              <Link
                href={`/players/${playerSlug(entry.player)}`}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
              >
                <CountryFlag code={entry.player.countryCode} className="h-3 w-4" />
                {entry.player.name}
              </Link>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
