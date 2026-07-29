"use client";

import Link from "next/link";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  AlertTriangle,
  Award,
  Camera,
  Crown,
  Flag,
  Flame,
  Navigation,
  Star,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";

import { CountryFlag } from "@/components/shared/country-flag";
import { formatToPar } from "@/lib/leaderboard";
import { cn, playerSlug } from "@/lib/utils";
import { scorePillClass, TILE_CLASS, NEUTRAL_TILE_CLASS } from "@/components/leaderboard/leaderboard-table";
import { InstagramEmbed } from "@/components/live-blog/instagram-embed";
import type { LiveBlogCategory, LiveBlogCompetition, LiveBlogEntry } from "@/lib/data/live-blog";

const CATEGORY_META: Record<LiveBlogCategory, { label: string; icon: typeof Star; chipClass: string }> = {
  eagle: { label: "Eagle", icon: Star, chipClass: "bg-[#910149] text-white" },
  birdie: { label: "Birdie", icon: ArrowDownCircle, chipClass: "bg-[#CB333B] text-white" },
  "moving-up": { label: "Moving up", icon: TrendingUp, chipClass: "bg-[#CB333B] text-white" },
  charge: { label: "Making a charge", icon: Flame, chipClass: "bg-[#910149] text-white" },
  bogey: { label: "Bogey", icon: ArrowUpCircle, chipClass: "bg-[#08325A] text-white" },
  "moving-down": { label: "Moving down", icon: TrendingDown, chipClass: "bg-[#08325A] text-white" },
  trouble: { label: "Trouble", icon: AlertTriangle, chipClass: "bg-[#08325A] text-white" },
  leader: { label: "Leader", icon: Crown, chipClass: "bg-[#0E3D2C] text-white" },
  through: { label: "Through", icon: Navigation, chipClass: "bg-[#0E3D2C] text-white" },
  "clubhouse-leader": { label: "Clubhouse leader", icon: Award, chipClass: "bg-[#0E3D2C] text-white" },
  "round-complete": { label: "In the clubhouse", icon: Flag, chipClass: "bg-surface-dark-foreground/10 text-surface-dark-foreground" },
  "last-group": { label: "Last group out", icon: Users, chipClass: "bg-surface-dark-foreground/10 text-surface-dark-foreground" },
  championship: { label: "Championship", icon: Trophy, chipClass: "bg-accent text-accent-foreground" },
  instagram: {
    label: "Instagram",
    icon: Camera,
    chipClass: "bg-gradient-to-tr from-[#FEDA75] via-[#D62976] to-[#4F5BD5] text-white",
  },
};

const COMPETITION_LABEL: Record<LiveBlogCompetition, string> = {
  main: "Main",
  stableford: "Stableford",
  scratch: "Scratch",
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
        const isStableford = entry.competition === "stableford";
        return (
          <article key={entry.id} className="border border-surface-dark-foreground/15 bg-surface-dark-foreground/5 p-5">
            <div className="mb-3 flex items-center justify-between gap-4">
              <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase tracking-wide", meta.chipClass)}>
                <Icon className="h-3.5 w-3.5" />
                {meta.label}
                {entry.competition ? ` · ${COMPETITION_LABEL[entry.competition]}` : ""}
              </span>
              <span className="text-xs text-surface-dark-foreground/50 tabular-nums">
                {formatTime(entry.postedAt)} · {formatDate(entry.postedAt)}
              </span>
            </div>
            <h3 className="mb-1.5 font-display text-lg font-bold">{entry.headline}</h3>
            {entry.body ? <p className="text-base leading-relaxed text-surface-dark-foreground/80">{entry.body}</p> : null}
            {entry.category === "instagram" && entry.instagramUrl ? (
              <div className="mt-3 flex justify-center overflow-hidden [&_iframe]:!max-w-full">
                <InstagramEmbed url={entry.instagramUrl} />
              </div>
            ) : null}
            <div className="mt-3 flex items-center gap-3">
              {entry.player ? (
                <Link
                  href={`/players/${playerSlug(entry.player)}`}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
                >
                  <CountryFlag code={entry.player.countryCode} className="h-3 w-4" />
                  {entry.player.name}
                </Link>
              ) : null}
              {entry.scoreRelative !== undefined ? (
                <span
                  className={cn(
                    TILE_CLASS,
                    isStableford ? NEUTRAL_TILE_CLASS : scorePillClass(entry.scoreRelative),
                  )}
                >
                  {isStableford ? `${entry.scoreRelative} pts` : formatToPar(entry.scoreRelative)}
                </span>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
