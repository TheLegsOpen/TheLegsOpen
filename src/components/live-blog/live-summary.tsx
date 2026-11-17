import Link from "next/link";

import { RichTextBlock } from "@/components/shared/rich-text";
import { formatToPar, isConcluded } from "@/lib/leaderboard";
import type { LiveBlogSummarySettings } from "@/lib/data/live-blog";
import { cn } from "@/lib/utils";
import type { CompetitionEntry } from "@/lib/data/scorecards";

// The yellow box at the head of the live blog, after theopen.com's "LIVE · THE 154TH OPEN" panel.
// By default it writes itself from the leaderboards (the three leaders while the round is on, the
// three winners once it is over); Live Blog Config in the admin can retitle it, set the badge, add
// hand-written points with links, switch the automatic lines off, or hide it.

function mainScore(entry: CompetitionEntry): string {
  return entry.toPar === undefined ? "" : formatToPar(entry.toPar);
}

function thru(entry: CompetitionEntry): string {
  return entry.thru === "F" ? "" : entry.started ? ` thru ${entry.thru}` : "";
}

export function LiveSummary({
  title,
  venueName,
  inPlay,
  main,
  stableford,
  scratch,
  stablefordChampion,
  settings,
}: {
  title: string;
  venueName?: string;
  inPlay: boolean;
  main: CompetitionEntry[];
  stableford: CompetitionEntry[];
  scratch: CompetitionEntry[];
  stablefordChampion?: CompetitionEntry;
  settings: LiveBlogSummarySettings;
}) {
  if (!settings.show) return null;
  const done = !inPlay && main.length > 0 && isConcluded(main);
  const lines: React.ReactNode[] = [];
  const m = main[0];
  const st = done ? (stablefordChampion ?? stableford[0]) : stableford[0];
  const sc = scratch[0];

  const auto = settings.autoLines;
  if (auto && m?.started) {
    lines.push(
      done ? (
        <>
          <b>{m.player.name}</b> is Champion Golfer of the Year{venueName ? ` at ${venueName}` : ""}, on {mainScore(m)}.
        </>
      ) : (
        <>
          <b>{m.player.name}</b> {m.tied ? "shares the lead" : "leads"} the Main at {mainScore(m) || "E"}
          {thru(m)}.
        </>
      ),
    );
  }
  if (auto && st?.started) {
    lines.push(
      <>
        Stableford: <b>{st.player.name}</b>, {st.score} pts{done ? "" : thru(st)}.
      </>,
    );
  }
  if (auto && sc?.started) {
    lines.push(
      <>
        Scratch: <b>{sc.player.name}</b>, {mainScore(sc)}
        {done ? "" : thru(sc)}.
      </>,
    );
  }
  if (auto) lines.push(
    <>
      Full leaderboard{" "}
      <Link href="/leaderboard" className="underline underline-offset-2 hover:no-underline">
        here
      </Link>
      .
    </>,
  );

  if (lines.length === 0 && !settings.points) return null;
  const badge = settings.badge === "auto" ? (inPlay ? "live" : "final") : settings.badge;

  return (
    <section
      aria-label="Championship summary"
      className="-mx-5 grid gap-5 bg-accent px-5 py-7 text-accent-foreground md:-mx-[30px] md:px-[30px] lg:mx-0 lg:grid-cols-[200px_1fr] lg:gap-8 lg:px-8 lg:py-9"
    >
      <div className="flex items-start justify-between gap-4 lg:flex-col lg:justify-start">
        <h2 className="font-display text-[28px] uppercase leading-[1.05] lg:text-[30px]">{settings.title ?? title}</h2>
        {badge !== "none" ? (
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white",
              badge === "live" ? "bg-[#d71920]" : "bg-[#06051e]",
            )}
          >
            {badge === "live" ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> : null}
            {badge === "live" ? "Live" : "Final"}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5 text-[15px] leading-relaxed">
        {lines.length > 0 ? (
          <ul className="flex list-disc flex-col gap-1.5 pl-4 marker:text-accent-foreground/60">
            {lines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        ) : null}
        {settings.points ? (
          // Styled to run on as the same list: the admin's bullets line up with the automatic ones.
          <RichTextBlock
            data={settings.points}
            dropBlankParagraphs
            className="gap-1.5 text-[15px] text-accent-foreground [&_a]:font-normal [&_a]:text-accent-foreground [&_li]:marker:text-accent-foreground/60 [&_ul]:ml-4 [&_ul]:gap-1.5"
          />
        ) : null}
      </div>
    </section>
  );
}
