import Link from "next/link";

import { ArticleCard } from "@/components/news/article-card";
import { SponsorTimeWidget } from "@/components/shared/sponsor-time-widget";
import { WeatherWidget } from "@/components/shared/weather-widget";
import { cn } from "@/lib/utils";
import type { Article } from "@/types/article";
import type { SponsorClock } from "@/lib/data/sponsor-clock";
import type { VenueWeather } from "@/lib/data/weather";
import type { LiveBlogEntry } from "@/lib/data/live-blog";
import type { CompetitionEntry } from "@/lib/data/scorecards";
import { formatToPar } from "@/lib/leaderboard";
import { splitSurnameFirst } from "@/lib/utils";

/** A tee time still to come, with the players due off at it. */
export interface UpcomingTeeTime {
  time: string;
  players: string[];
}

interface ChampionshipSidebarProps {
  featuredArticle: Article;
  clockConfig: SponsorClock;
  tone?: "light" | "dark";
  /**
   * The leaderboard's fuller rail (theopen.com stacks several modules where ours stopped after the
   * clock and one story, leaving a long empty column beside the table). Each block hides itself
   * when it has nothing to show: weather out of season, tee times once everyone is out.
   */
  weather?: VenueWeather | null;
  upcomingTeeTimes?: UpcomingTeeTime[];
  liveBlog?: LiveBlogEntry[];
  /** The Main leaderboard's top ten, for the Tee Times rail. */
  topTen?: CompetitionEntry[];
  /** Keep the rail in view while the table beside it scrolls (desktop only). */
  sticky?: boolean;
}

function RailHeading({ children, isDark }: { children: React.ReactNode; isDark: boolean }) {
  return (
    <p className={cn("text-xs font-semibold uppercase tracking-[0.14em]", isDark ? "text-surface-dark-foreground/50" : "text-muted-foreground")}>
      {children}
    </p>
  );
}

function postedTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
}

export function ChampionshipSidebar({ featuredArticle, clockConfig, tone = "light", weather, upcomingTeeTimes, liveBlog, topTen, sticky = false }: ChampionshipSidebarProps) {
  const isDark = tone === "dark";
  const border = isDark ? "border-surface-dark-foreground/15" : "border-border";
  return (
    <aside className={cn("flex flex-col gap-6", sticky && "lg:sticky lg:top-24")}>
      <SponsorTimeWidget config={clockConfig} />

      {weather ? <WeatherWidget weather={weather} /> : null}

      {topTen && topTen.length > 0 ? (
        <div className="flex flex-col gap-3">
          <RailHeading isDark={isDark}>Top 10</RailHeading>
          <ol className="flex flex-col">
            {topTen.map((entry) => {
              const { surname, firstName } = splitSurnameFirst(entry.player.name);
              return (
                <li key={entry.player.id} className="flex items-center gap-3 border-b border-black/10 bg-accent/90 px-3 py-2 text-sm text-accent-foreground last:border-0">
                  <span className="w-8 shrink-0 tabular-nums">{`${entry.tied ? "T" : ""}${entry.position}`}</span>
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-bold uppercase">{surname}</span>, {firstName.charAt(0)}
                  </span>
                  <span className="w-10 text-right font-bold tabular-nums">
                    {entry.noReturn ? "NR" : entry.toPar === undefined ? "—" : formatToPar(entry.toPar)}
                  </span>
                  <span className="w-6 text-right text-xs tabular-nums">{entry.thru}</span>
                </li>
              );
            })}
          </ol>
          <Link href="/leaderboard" className="text-xs font-bold uppercase tracking-wide text-accent hover:underline">
            Full leaderboard →
          </Link>
        </div>
      ) : null}

      {upcomingTeeTimes && upcomingTeeTimes.length > 0 ? (
        <div className="flex flex-col gap-3">
          <RailHeading isDark={isDark}>Next on the tee</RailHeading>
          <ul className={cn("flex flex-col divide-y border-y", border, isDark ? "divide-surface-dark-foreground/15" : "divide-border")}>
            {upcomingTeeTimes.map((slot) => (
              <li key={slot.time} className="flex items-baseline gap-4 py-3 text-sm">
                <span className="w-12 shrink-0 font-bold tabular-nums text-accent">{slot.time}</span>
                <span className={isDark ? "text-surface-dark-foreground/80" : "text-foreground"}>{slot.players.join(", ")}</span>
              </li>
            ))}
          </ul>
          <Link href="/tee-times" className="text-xs font-bold uppercase tracking-wide text-accent hover:underline">
            All tee times →
          </Link>
        </div>
      ) : null}

      {liveBlog && liveBlog.length > 0 ? (
        <div className="flex flex-col gap-3">
          <RailHeading isDark={isDark}>Live blog</RailHeading>
          <ul className={cn("flex flex-col divide-y border-y", border, isDark ? "divide-surface-dark-foreground/15" : "divide-border")}>
            {liveBlog.map((post) => (
              <li key={post.id} className="py-3">
                <Link href="/live-blog" className="group flex flex-col gap-1">
                  <span className={cn("text-[11px] tabular-nums", isDark ? "text-surface-dark-foreground/50" : "text-muted-foreground")}>
                    {postedTime(post.postedAt)}
                  </span>
                  <span className={cn("font-display text-[15px] leading-snug group-hover:underline", isDark ? "text-surface-dark-foreground" : "text-foreground")}>
                    {post.headline}
                  </span>
                  <span className={cn("line-clamp-2 text-xs", isDark ? "text-surface-dark-foreground/70" : "text-muted-foreground")}>{post.body}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/live-blog" className="text-xs font-bold uppercase tracking-wide text-accent hover:underline">
            Full live blog →
          </Link>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <RailHeading isDark={isDark}>Latest News</RailHeading>
        {/* A 455px rail, not a third of the page -- see GRID_SIZES in ArticleCard. */}
        <ArticleCard article={featuredArticle} tone={tone} sizes="(min-width: 1430px) 455px, (min-width: 1024px) 32vw, 100vw" />
      </div>
    </aside>
  );
}
