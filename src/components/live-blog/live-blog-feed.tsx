"use client";

import { Fragment, useState } from "react";
import Image from "next/image";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  AlertTriangle,
  Award,
  Check,
  Building2,
  Camera,
  ChevronsDown,
  Crown,
  Equal,
  Flag,
  FlagTriangleRight,
  Flame,
  Frown,
  Gauge,
  Gem,
  LogOut,
  Loader2,
  Landmark,
  Medal,
  Newspaper,
  Rocket,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Star,
  Swords,
  Target,
  Timer,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
  XCircle,
  Zap,
} from "lucide-react";

import { CountryFlag } from "@/components/shared/country-flag";
import { formatToPar } from "@/lib/leaderboard";
import { cn } from "@/lib/utils";
import { scorePillClass, TILE_CLASS, NEUTRAL_TILE_CLASS } from "@/components/leaderboard/leaderboard-table";
import { PlayerPopup } from "@/components/leaderboard/player-popup";
import { InstagramEmbed } from "@/components/live-blog/instagram-embed";
import { useFavorites } from "@/hooks/use-favorites";
import { useLiveBlogRealtime } from "@/hooks/use-live-blog-realtime";
import type { LiveBlogCategory, LiveBlogCompetition, LiveBlogEntry, LiveBlogFilter, LiveBlogPage } from "@/lib/data/live-blog";

/** theopen.com's Filter menu, in our terms. The filtering itself happens in the query (see getLiveBlogPosts), so each page comes back full. */
const FILTER_OPTIONS: { value: LiveBlogFilter; label: string }[] = [
  { value: "all", label: "All posts" },
  { value: "main", label: "Main" },
  { value: "stableford", label: "Stableford" },
  { value: "scratch", label: "Scratch" },
  { value: "moments", label: "Big moments" },
];
import type { CompetitionEntry } from "@/lib/data/scorecards";
import type { StatCategory } from "@/lib/statistics";

/** `cardClass` colours the whole post like the scoring-indicator dots (Eagle/Birdie/Bogey only) -- everything else stays a plain white card with just a coloured chip. Every existing coloured card is a dark background needing light text, hence that being the default; `cardTextTone: "dark"` opts a light-background card (winner-confirmed) back into dark text instead. */
export const CATEGORY_META: Record<
  LiveBlogCategory,
  { label: string; icon: typeof Star; chipClass: string; cardClass?: string; cardTextTone?: "light" | "dark" }
> = {
  ace: { label: "Hole in one", icon: Sparkles, chipClass: "bg-accent text-accent-foreground", cardClass: "bg-accent text-accent-foreground" },
  albatross: { label: "Albatross", icon: Gem, chipClass: "bg-accent text-accent-foreground", cardClass: "bg-accent text-accent-foreground" },
  eagle: { label: "Eagle", icon: Star, chipClass: "bg-[#910149] text-white", cardClass: "bg-[#910149] text-white" },
  "nett-eagle": { label: "Nett eagle", icon: Star, chipClass: "bg-[#910149] text-white", cardClass: "bg-[#910149] text-white" },
  birdie: { label: "Birdie", icon: ArrowUpCircle, chipClass: "bg-[#CB333B] text-white", cardClass: "bg-[#CB333B] text-white" },
  "moving-up": { label: "Moving up", icon: TrendingUp, chipClass: "bg-[#CB333B] text-white" },
  charge: { label: "Making a charge", icon: Flame, chipClass: "bg-[#910149] text-white" },
  "hot-streak": { label: "Hot streak", icon: Zap, chipClass: "bg-[#910149] text-white", cardClass: "bg-[#910149] text-white" },
  bogey: { label: "Bogey", icon: ArrowDownCircle, chipClass: "bg-[#08325A] text-white", cardClass: "bg-[#08325A] text-white" },
  "double-bogey": { label: "Double bogey or worse", icon: ChevronsDown, chipClass: "bg-[#4D91C6] text-white", cardClass: "bg-[#4D91C6] text-white" },
  "moving-down": { label: "Moving down", icon: TrendingDown, chipClass: "bg-[#08325A] text-white" },
  trouble: { label: "Trouble", icon: AlertTriangle, chipClass: "bg-[#08325A] text-white" },
  "leader-falters": { label: "Leader falters", icon: Frown, chipClass: "bg-[#08325A] text-white", cardClass: "bg-[#08325A] text-white" },
  "challenge-falters": { label: "Challenge falters", icon: Frown, chipClass: "bg-[#08325A] text-white" },
  leader: { label: "Leader", icon: Crown, chipClass: "bg-accent text-accent-foreground" },
  tie: { label: "Tie for lead", icon: Equal, chipClass: "bg-accent text-accent-foreground" },
  "lead-extends": { label: "Lead extends", icon: Rocket, chipClass: "bg-accent text-accent-foreground" },
  "entering-contention": { label: "Into contention", icon: Target, chipClass: "bg-[#CB333B] text-white" },
  "leaving-contention": { label: "Falling back", icon: LogOut, chipClass: "bg-[#08325A] text-white" },
  "pressure-moment": { label: "Pressure moment", icon: Timer, chipClass: "bg-accent text-accent-foreground" },
  through: { label: "Through", icon: FlagTriangleRight, chipClass: "bg-accent text-accent-foreground" },
  "clubhouse-leader": { label: "Clubhouse leader", icon: Building2, chipClass: "bg-accent text-accent-foreground" },
  "best-gross-round": { label: "Best gross round", icon: Medal, chipClass: "bg-accent text-accent-foreground" },
  "round-complete": { label: "In the clubhouse", icon: Flag, chipClass: "bg-foreground/10 text-foreground" },
  "winner-confirmed": {
    label: "Winner confirmed",
    icon: Trophy,
    chipClass: "bg-[#08325A] text-white",
    cardClass: "bg-white text-[#08325A]",
    cardTextTone: "dark",
  },
  playoff: { label: "Playoff", icon: Swords, chipClass: "bg-accent text-accent-foreground", cardClass: "bg-accent text-accent-foreground" },
  "no-return": { label: "No return", icon: XCircle, chipClass: "bg-[#08325A] text-white", cardClass: "bg-[#08325A] text-white" },
  "defending-champion": {
    label: "Defending champion",
    icon: Shield,
    chipClass: "bg-foreground/10 text-foreground",
  },
  "turn-report": { label: "Front-nine report", icon: Newspaper, chipClass: "bg-accent text-accent-foreground" },
  "course-record-pace": { label: "Record pace", icon: Gauge, chipClass: "bg-accent text-accent-foreground" },
  "course-record": { label: "Course record", icon: Award, chipClass: "bg-accent text-accent-foreground", cardClass: "bg-accent text-accent-foreground" },
  "record-lead": { label: "Record lead", icon: Landmark, chipClass: "bg-accent text-accent-foreground", cardClass: "bg-accent text-accent-foreground" },
  "record-margin": { label: "Record margin", icon: Landmark, chipClass: "bg-accent text-accent-foreground", cardClass: "bg-accent text-accent-foreground" },
  "record-low-score": { label: "Record winning score", icon: Landmark, chipClass: "bg-accent text-accent-foreground", cardClass: "bg-accent text-accent-foreground" },
  "last-group": { label: "Last group out", icon: Users, chipClass: "bg-foreground/10 text-foreground" },
  championship: { label: "Championship", icon: Trophy, chipClass: "bg-accent text-accent-foreground" },
  instagram: {
    label: "Instagram",
    icon: Camera,
    chipClass: "bg-gradient-to-tr from-[#FEDA75] via-[#D62976] to-[#4F5BD5] text-white",
  },
};

export const COMPETITION_LABEL: Record<LiveBlogCompetition, string> = {
  main: "Main",
  stableford: "Stableford",
  scratch: "Scratch",
};

/** A separate, solidly-coloured pill (distinct from the category chip's own colour) so which
 * board a post relates to reads at a glance instead of being buried as small inline text. */
export const COMPETITION_BADGE_CLASS: Record<LiveBlogCompetition, string> = {
  main: "bg-primary text-primary-foreground",
  stableford: "bg-[#2269AB] text-white",
  scratch: "bg-[#6B7280] text-white",
};

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

interface LiveBlogFeedProps {
  initialEntries: LiveBlogEntry[];
  initialHasNextPage: boolean;
  mainEntries: CompetitionEntry[];
  stablefordEntries: CompetitionEntry[];
  scratchEntries: CompetitionEntry[];
  nettCategories: StatCategory[];
  scratchCategories: StatCategory[];
  streakCategories: StatCategory[];
  drivingCategories: StatCategory[];
  approachCategories: StatCategory[];
  puttingCategories: StatCategory[];
  /** Pass when showing a specific past championship (e.g. Previous Opens) rather than whichever is currently active, so "Load more" keeps paging that same year. */
  championshipId?: string;
  /** The resolved championship these initialEntries belong to (see LiveBlogPage.championshipId) --
   * distinct from championshipId above, which is only ever passed for a past year. This is always
   * set when there's an active championship, so realtime works for the live "currently active" case too. */
  realtimeChampionshipId?: string | null;
  /** The site's crest, recoloured to #08325A in place of the trophy icon on winner-confirmed posts. */
  logoUrl?: string;
  /** "dark" when the feed sits on a navy panel (the Previous Opens tab): a light spine and gold-ringed dots, which the default grey line and navy rings vanish into. */
  tone?: "light" | "dark";
}

export function LiveBlogFeed({
  initialEntries,
  initialHasNextPage,
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
  realtimeChampionshipId,
  logoUrl,
  tone = "light",
}: LiveBlogFeedProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(initialHasNextPage);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState<LiveBlogFilter>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filtering, setFiltering] = useState(false);

  function feedQuery(pageNumber: number, f: LiveBlogFilter = filter) {
    const params = new URLSearchParams({ page: String(pageNumber) });
    if (championshipId) params.set("championshipId", championshipId);
    if (f !== "all") params.set("filter", f);
    return `/api/live-blog-feed?${params.toString()}`;
  }

  async function chooseFilter(next: LiveBlogFilter) {
    setFilterOpen(false);
    if (next === filter) return;
    setFilter(next);
    setFiltering(true);
    try {
      const res = await fetch(feedQuery(1, next));
      if (!res.ok) throw new Error("Failed to filter posts");
      const data: LiveBlogPage = await res.json();
      setEntries(data.entries);
      setHasNextPage(data.hasNextPage);
      setPage(1);
    } catch {
      // Keep whatever is showing; the menu stays available to try again.
    } finally {
      setFiltering(false);
    }
  }

  useLiveBlogRealtime(realtimeChampionshipId, async () => {
    const res = await fetch(feedQuery(1));
    if (!res.ok) return;
    const data: LiveBlogPage = await res.json();
    setEntries((prev) => {
      const existingIds = new Set(prev.map((e) => e.id));
      const fresh = data.entries.filter((e) => !existingIds.has(e.id));
      return fresh.length ? [...fresh, ...prev] : prev;
    });
  });

  const { favorites, toggleFavorite } = useFavorites();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const selectedMain = mainEntries.find((e) => e.player.id === selectedPlayerId);
  const selectedStableford = stablefordEntries.find((e) => e.player.id === selectedPlayerId);
  const selectedScratch = scratchEntries.find((e) => e.player.id === selectedPlayerId);
  const leaderToPar = mainEntries[0]?.toPar ?? 0;

  async function loadMore() {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await fetch(feedQuery(nextPage));
      if (!res.ok) throw new Error("Failed to load more posts");
      const data: LiveBlogPage = await res.json();
      setEntries((prev) => [...prev, ...data.entries]);
      setHasNextPage(data.hasNextPage);
      setPage(nextPage);
    } catch {
      // Leave hasNextPage as-is so the button just stays available to retry.
    } finally {
      setLoadingMore(false);
    }
  }

  const activeLabel = FILTER_OPTIONS.find((o) => o.value === filter)?.label ?? "All posts";
  const filterBar = (
    <div className="relative flex items-center justify-end gap-3">
      {filter !== "all" ? (
        <button type="button" onClick={() => chooseFilter("all")} className={cn("text-xs font-bold uppercase tracking-wide underline-offset-2 hover:underline", tone === "dark" ? "text-surface-dark-foreground/70" : "text-black/60")}>
          Clear
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => setFilterOpen((v) => !v)}
        aria-expanded={filterOpen}
        aria-haspopup="menu"
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-5 py-2 text-[13px] font-bold uppercase tracking-wide transition-colors",
          tone === "dark" ? "border-surface-dark-foreground/40 text-surface-dark-foreground hover:bg-white/10" : "border-black/20 bg-white text-primary hover:bg-black/5",
          filter !== "all" && "border-accent bg-accent text-accent-foreground hover:bg-accent/90",
        )}
      >
        {filtering ? <Loader2 className="h-4 w-4 animate-spin" /> : <SlidersHorizontal className="h-4 w-4" />}
        {filter === "all" ? "Filter" : activeLabel}
      </button>
      {filterOpen ? (
        <ul role="menu" className="absolute right-0 top-full z-20 mt-2 w-48 overflow-hidden border border-black/10 bg-white py-1 text-sm text-primary shadow-lg">
          {FILTER_OPTIONS.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                role="menuitemradio"
                aria-checked={filter === o.value}
                onClick={() => chooseFilter(o.value)}
                className={cn("flex w-full items-center justify-between px-4 py-2 text-left hover:bg-black/5", filter === o.value && "font-bold")}
              >
                {o.label}
                {filter === o.value ? <Check className="h-4 w-4" /> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );

  if (entries.length === 0 && filter !== "all") {
    return (
      <div className="flex flex-col gap-6">
        {filterBar}
        <div className="flex flex-col items-center gap-2 border border-dashed border-black/20 bg-white py-16 text-center">
          <p className="font-display font-bold text-lg text-primary">Nothing here yet</p>
          <p className="text-sm text-black/60">No {activeLabel.toLowerCase()} posts so far.</p>
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 border border-dashed border-black/20 bg-white py-16 text-center">
        <p className="font-display font-bold text-lg text-primary">No updates yet</p>
        <p className="text-sm text-black/60">Posts will appear here automatically as notable scores come in.</p>
      </div>
    );
  }

  const feedGrid = (
    <div className="grid grid-cols-[24px_1fr] gap-x-4 gap-y-4">
      {/* Timeline spine: a single element spanning every entry's grid row (and the gaps between
          them), kept in its own gutter column so it never shares space with a card's own
          background -- unlike an absolutely-positioned overlay sized to the whole list, this
          never has to "hide behind" opaque card content, it's simply never underneath it. */}
      <div className="pointer-events-none relative col-start-1" style={{ gridRow: `1 / ${entries.length + 1}` }} aria-hidden="true">
        <div className={cn("absolute inset-y-0 left-1/2 w-px -translate-x-1/2", tone === "dark" ? "bg-white/30" : "bg-black/15")} />
      </div>

      {entries.map((entry, index) => {
        const meta = CATEGORY_META[entry.category];
        const Icon = meta.icon;
        const isStableford = entry.competition === "stableford";
        const isColored = Boolean(meta.cardClass);
        // Every other coloured card is a dark background needing light text; winner-confirmed is
        // the one light (white) coloured background, needing the same dark navy text a plain
        // white card would use instead.
        const lightText = isColored && meta.cardTextTone !== "dark";
        const isWinnerConfirmed = entry.category === "winner-confirmed";
        return (
          <Fragment key={entry.id}>
            <div className="relative col-start-1" style={{ gridRow: index + 1 }} aria-hidden="true">
              <span
                className={cn(
                  "absolute left-1/2 top-7 h-4 w-4 -translate-x-1/2 rounded-full border-2",
                  tone === "dark" ? "border-accent bg-surface-dark" : "border-primary bg-white",
                )}
              />
            </div>
            <article
              className={cn("col-start-2 border border-black/10 py-6 px-5", meta.cardClass ?? "bg-white")}
              style={{ gridRow: index + 1 }}
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase tracking-wide",
                      lightText ? "bg-white/15 text-white" : meta.chipClass,
                    )}
                  >
                    {isWinnerConfirmed && logoUrl ? (
                      // A CSS filter chain only approximates a target colour -- mask-image paints
                      // white exactly through the logo's own alpha shape instead of guessing at
                      // brightness/hue values that happen to land close to it. White, not navy,
                      // since this chip's own background is navy (meta.chipClass) -- the icon needs
                      // to contrast against that, not match it.
                      <span
                        role="img"
                        aria-label=""
                        className="h-3.5 w-3.5 shrink-0 bg-white"
                        style={{
                          maskImage: `url(${logoUrl})`,
                          maskSize: "contain",
                          maskRepeat: "no-repeat",
                          maskPosition: "center",
                          WebkitMaskImage: `url(${logoUrl})`,
                          WebkitMaskSize: "contain",
                          WebkitMaskRepeat: "no-repeat",
                          WebkitMaskPosition: "center",
                        }}
                      />
                    ) : (
                      <Icon className="h-3.5 w-3.5" />
                    )}
                    {meta.label}
                  </span>
                  {entry.competition ? (
                    <span className={cn("px-2.5 py-1 text-xs font-bold uppercase tracking-wide", COMPETITION_BADGE_CLASS[entry.competition])}>
                      {COMPETITION_LABEL[entry.competition]}
                    </span>
                  ) : null}
                </div>
                <span className={cn("font-display text-sm tabular-nums", lightText ? "text-white/70" : isWinnerConfirmed ? "text-[#08325A]/70" : "text-black/50")}>
                  {formatTime(entry.postedAt)} · {formatDate(entry.postedAt)}
                </span>
              </div>
              <h3 className={cn("mb-1.5 font-display text-lg font-bold", lightText ? "text-white" : isWinnerConfirmed ? "text-[#08325A]" : "text-primary")}>
                {entry.headline}
              </h3>
              {entry.body ? (
                <p className={cn("text-base leading-relaxed", lightText ? "text-white/90" : isWinnerConfirmed ? "text-[#08325A]/90" : "text-black/70")}>
                  {entry.body}
                </p>
              ) : null}
              {entry.imageUrl ? (
                <div className="mt-3 overflow-hidden rounded-md">
                  <Image src={entry.imageUrl} alt="" width={640} height={360} className="h-auto w-full object-cover" />
                </div>
              ) : null}
              {entry.category === "instagram" && entry.instagramUrl ? (
                <div className="mt-3 flex justify-center overflow-hidden [&_iframe]:!max-w-full">
                  <InstagramEmbed url={entry.instagramUrl} />
                </div>
              ) : null}
              <div className="mt-3 flex items-center gap-3">
                {entry.player ? (
                  <button
                    type="button"
                    onClick={() => setSelectedPlayerId(entry.player!.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 text-sm font-semibold hover:underline",
                      lightText ? "text-white" : isWinnerConfirmed ? "text-[#08325A]" : "text-accent",
                    )}
                  >
                    <CountryFlag code={entry.player.countryCode} className="h-3 w-4" />
                    {entry.player.name}
                  </button>
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

  return (
    <div className="flex flex-col gap-8">
      {filterBar}
      <div className={cn("transition-opacity", filtering && "opacity-50")}>{feedGrid}</div>

      {hasNextPage ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="inline-flex items-center gap-2 bg-[#2269AB] px-8 py-3.5 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-[#1b558a] disabled:opacity-60"
          >
            {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      ) : null}

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
        initialCompetition="main"
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
