"use client";

import { Fragment } from "react";
import Link from "next/link";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  AlertTriangle,
  Building2,
  Camera,
  Crown,
  Equal,
  Flag,
  FlagTriangleRight,
  Flame,
  LogOut,
  Rocket,
  Sparkles,
  Star,
  Target,
  Timer,
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

/** `cardClass` colours the whole post like the scoring-indicator dots (Eagle/Birdie/Bogey only) -- everything else stays a plain white card with just a coloured chip. */
export const CATEGORY_META: Record<LiveBlogCategory, { label: string; icon: typeof Star; chipClass: string; cardClass?: string }> = {
  ace: { label: "Hole in one", icon: Sparkles, chipClass: "bg-accent text-accent-foreground", cardClass: "bg-accent text-accent-foreground" },
  eagle: { label: "Eagle", icon: Star, chipClass: "bg-[#910149] text-white", cardClass: "bg-[#910149] text-white" },
  birdie: { label: "Birdie", icon: ArrowDownCircle, chipClass: "bg-[#CB333B] text-white", cardClass: "bg-[#CB333B] text-white" },
  "moving-up": { label: "Moving up", icon: TrendingUp, chipClass: "bg-[#CB333B] text-white" },
  charge: { label: "Making a charge", icon: Flame, chipClass: "bg-[#910149] text-white" },
  bogey: { label: "Bogey", icon: ArrowUpCircle, chipClass: "bg-[#08325A] text-white", cardClass: "bg-[#08325A] text-white" },
  "moving-down": { label: "Moving down", icon: TrendingDown, chipClass: "bg-[#08325A] text-white" },
  trouble: { label: "Trouble", icon: AlertTriangle, chipClass: "bg-[#08325A] text-white" },
  leader: { label: "Leader", icon: Crown, chipClass: "bg-accent text-accent-foreground" },
  tie: { label: "Tie for lead", icon: Equal, chipClass: "bg-accent text-accent-foreground" },
  "lead-extends": { label: "Lead extends", icon: Rocket, chipClass: "bg-accent text-accent-foreground" },
  "entering-contention": { label: "Into contention", icon: Target, chipClass: "bg-[#CB333B] text-white" },
  "leaving-contention": { label: "Falling back", icon: LogOut, chipClass: "bg-[#08325A] text-white" },
  "pressure-moment": { label: "Pressure moment", icon: Timer, chipClass: "bg-accent text-accent-foreground" },
  through: { label: "Through", icon: FlagTriangleRight, chipClass: "bg-accent text-accent-foreground" },
  "clubhouse-leader": { label: "Clubhouse leader", icon: Building2, chipClass: "bg-accent text-accent-foreground" },
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

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

interface LiveBlogFeedProps {
  entries: LiveBlogEntry[];
}

export function LiveBlogFeed({ entries }: LiveBlogFeedProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 border border-dashed border-black/20 bg-white py-16 text-center">
        <p className="font-display font-bold text-lg text-primary">No updates yet</p>
        <p className="text-sm text-black/60">Posts will appear here automatically as notable scores come in.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[24px_1fr] gap-x-4 gap-y-4">
      {/* Timeline spine: a single element spanning every entry's grid row (and the gaps between
          them), kept in its own gutter column so it never shares space with a card's own
          background -- unlike an absolutely-positioned overlay sized to the whole list, this
          never has to "hide behind" opaque card content, it's simply never underneath it. */}
      <div className="pointer-events-none relative col-start-1" style={{ gridRow: `1 / ${entries.length + 1}` }} aria-hidden="true">
        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-black/15" />
      </div>

      {entries.map((entry, index) => {
        const meta = CATEGORY_META[entry.category];
        const Icon = meta.icon;
        const isStableford = entry.competition === "stableford";
        const isColored = Boolean(meta.cardClass);
        return (
          <Fragment key={entry.id}>
            <div className="relative col-start-1" style={{ gridRow: index + 1 }} aria-hidden="true">
              <span className="absolute left-1/2 top-7 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-primary bg-white" />
            </div>
            <article
              className={cn("col-start-2 border border-black/10 py-6 px-5", meta.cardClass ?? "bg-white")}
              style={{ gridRow: index + 1 }}
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase tracking-wide",
                    isColored ? "bg-white/15 text-white" : meta.chipClass,
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {meta.label}
                  {entry.competition ? ` · ${COMPETITION_LABEL[entry.competition]}` : ""}
                </span>
                <span className={cn("font-display text-sm tabular-nums", isColored ? "text-white/70" : "text-black/50")}>
                  {formatTime(entry.postedAt)} · {formatDate(entry.postedAt)}
                </span>
              </div>
              <h3 className={cn("mb-1.5 font-display text-lg font-bold", isColored ? "text-white" : "text-primary")}>{entry.headline}</h3>
              {entry.body ? (
                <p className={cn("text-base leading-relaxed", isColored ? "text-white/90" : "text-black/70")}>{entry.body}</p>
              ) : null}
              {entry.category === "instagram" && entry.instagramUrl ? (
                <div className="mt-3 flex justify-center overflow-hidden [&_iframe]:!max-w-full">
                  <InstagramEmbed url={entry.instagramUrl} />
                </div>
              ) : null}
              <div className="mt-3 flex items-center gap-3">
                {entry.player ? (
                  <Link
                    href={`/players/${playerSlug(entry.player)}`}
                    className={cn(
                      "inline-flex items-center gap-1.5 text-sm font-semibold hover:underline",
                      isColored ? "text-white" : "text-accent",
                    )}
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
          </Fragment>
        );
      })}
    </div>
  );
}
