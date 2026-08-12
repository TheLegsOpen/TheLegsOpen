"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { CountryFlag } from "@/components/shared/country-flag";
import { PlayerPopup } from "@/components/leaderboard/player-popup";
import { useFavorites } from "@/hooks/use-favorites";
import { useLiveBlogRealtime } from "@/hooks/use-live-blog-realtime";
import { formatToPar } from "@/lib/leaderboard";
import { cn } from "@/lib/utils";
import { CATEGORY_META, COMPETITION_LABEL, COMPETITION_BADGE_CLASS, formatTime, formatDate } from "@/components/live-blog/live-blog-feed";
import { scorePillClass, TILE_CLASS, NEUTRAL_TILE_CLASS } from "@/components/leaderboard/leaderboard-table";
import type { LiveBlogEntry } from "@/lib/data/live-blog";
import type { CompetitionEntry, Competition } from "@/lib/data/scorecards";
import type { StatCategory } from "@/lib/statistics";

const WIDGET_POST_COUNT = 3;

interface LiveBlogWidgetProps {
  entries: LiveBlogEntry[];
  mainEntries: CompetitionEntry[];
  stablefordEntries: CompetitionEntry[];
  scratchEntries: CompetitionEntry[];
  nettCategories: StatCategory[];
  scratchCategories: StatCategory[];
  streakCategories: StatCategory[];
  drivingCategories: StatCategory[];
  approachCategories: StatCategory[];
  puttingCategories: StatCategory[];
  championshipId?: string | null;
}

export function LiveBlogWidget({
  entries,
  mainEntries,
  stablefordEntries,
  scratchEntries,
  nettCategories,
  scratchCategories,
  streakCategories,
  drivingCategories,
  approachCategories,
  puttingCategories,
  championshipId,
}: LiveBlogWidgetProps) {
  const router = useRouter();
  // The homepage already re-fetches this whole page every 10s (see AutoRefresh) -- realtime just
  // triggers that same refresh immediately instead of waiting out the interval, so a new post
  // (and any leaderboard change alongside it) appears without the delay.
  useLiveBlogRealtime(championshipId, () => router.refresh());

  const top = entries.slice(0, WIDGET_POST_COUNT);
  const { favorites, toggleFavorite } = useFavorites();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [popupCompetition, setPopupCompetition] = useState<Competition>("main");
  const selectedMain = mainEntries.find((e) => e.player.id === selectedPlayerId);
  const selectedStableford = stablefordEntries.find((e) => e.player.id === selectedPlayerId);
  const selectedScratch = scratchEntries.find((e) => e.player.id === selectedPlayerId);
  const leaderToPar = mainEntries[0]?.toPar ?? 0;

  return (
    <div className="flex h-full flex-col border border-surface-dark-foreground/15">
      <div className="bg-primary px-5 py-3">
        <h2 className="font-menu text-sm font-bold uppercase tracking-wide text-primary-foreground">Live Blog</h2>
      </div>

      {top.length === 0 ? (
        <p className="flex-1 bg-white p-5 text-sm text-black/60">Updates will appear here automatically as notable scores come in.</p>
      ) : (
        <div className="flex flex-1 flex-col bg-primary">
          {top.map((entry) => {
            const meta = CATEGORY_META[entry.category];
            const Icon = meta.icon;
            const isStableford = entry.competition === "stableford";
            const isColored = Boolean(meta.cardClass);
            return (
              <article
                key={entry.id}
                className={cn("border-b border-black/10 p-4 last:border-0", meta.cardClass ?? "bg-white")}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide",
                        isColored ? "bg-white/15 text-white" : meta.chipClass,
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {meta.label}
                    </span>
                    {entry.competition ? (
                      <span className={cn("px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide", COMPETITION_BADGE_CLASS[entry.competition])}>
                        {COMPETITION_LABEL[entry.competition]}
                      </span>
                    ) : null}
                  </div>
                  <span className={cn("text-[11px] tabular-nums", isColored ? "text-white/70" : "text-black/50")}>
                    {formatTime(entry.postedAt)} · {formatDate(entry.postedAt)}
                  </span>
                </div>
                <h3 className={cn("mb-1 font-display text-sm font-bold", isColored ? "text-white" : "text-primary")}>{entry.headline}</h3>
                {entry.body ? (
                  <p className={cn("mb-2 text-sm leading-relaxed", isColored ? "text-white/90" : "text-black/70")}>{entry.body}</p>
                ) : null}
                <div className="flex items-center gap-3">
                  {entry.player ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPlayerId(entry.player!.id);
                        setPopupCompetition(entry.competition ?? "main");
                      }}
                      className={cn(
                        "inline-flex items-center gap-1.5 text-xs font-semibold hover:underline",
                        isColored ? "text-white" : "text-accent",
                      )}
                    >
                      <CountryFlag code={entry.player.countryCode} className="h-3 w-4" />
                      {entry.player.name}
                    </button>
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

      <PlayerPopup
        main={selectedMain}
        stableford={selectedStableford}
        scratch={selectedScratch}
        nettCategories={nettCategories}
        scratchCategories={scratchCategories}
        streakCategories={streakCategories}
        drivingCategories={drivingCategories}
        approachCategories={approachCategories}
        puttingCategories={puttingCategories}
        initialCompetition={popupCompetition}
        leaderToPar={leaderToPar}
        isFav={selectedPlayerId ? favorites.includes(selectedPlayerId) : false}
        onToggleFavorite={() => selectedPlayerId && toggleFavorite(selectedPlayerId)}
        open={!!selectedMain}
        onOpenChange={(next) => {
          if (!next) setSelectedPlayerId(null);
        }}
      />
    </div>
  );
}
