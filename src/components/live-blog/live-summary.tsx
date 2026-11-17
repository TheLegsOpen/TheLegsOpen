import Link from "next/link";

import { formatToPar, isConcluded } from "@/lib/leaderboard";
import { cn } from "@/lib/utils";
import type { CompetitionEntry } from "@/lib/data/scorecards";

// The yellow box at the head of the live blog, after theopen.com's "LIVE · THE 154TH OPEN" panel.
// It writes itself from the leaderboards, so there is nothing to keep up to date in the admin:
// the three leaders while the round is on, the three winners once it is over.

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
}: {
  title: string;
  venueName?: string;
  inPlay: boolean;
  main: CompetitionEntry[];
  stableford: CompetitionEntry[];
  scratch: CompetitionEntry[];
  stablefordChampion?: CompetitionEntry;
}) {
  const done = !inPlay && main.length > 0 && isConcluded(main);
  const lines: React.ReactNode[] = [];
  const m = main[0];
  const st = done ? (stablefordChampion ?? stableford[0]) : stableford[0];
  const sc = scratch[0];

  if (m?.started) {
    lines.push(
      done ? (
        <>
          <b>{m.player.name}</b> is Champion Golfer{venueName ? ` at ${venueName}` : ""}, on {mainScore(m)}.
        </>
      ) : (
        <>
          <b>{m.player.name}</b> {m.tied ? "shares the lead" : "leads"} the Main at {mainScore(m) || "E"}
          {thru(m)}.
        </>
      ),
    );
  }
  if (st?.started) {
    lines.push(
      <>
        Stableford: <b>{st.player.name}</b>, {st.score} pts{done ? "" : thru(st)}.
      </>,
    );
  }
  if (sc?.started) {
    lines.push(
      <>
        Scratch: <b>{sc.player.name}</b>, {mainScore(sc)}
        {done ? "" : thru(sc)}.
      </>,
    );
  }
  lines.push(
    <>
      Full leaderboard{" "}
      <Link href="/leaderboard" className="underline underline-offset-2 hover:no-underline">
        here
      </Link>
      .
    </>,
  );

  return (
    <section
      aria-label="Championship summary"
      className="-mx-5 grid gap-5 bg-accent px-5 py-7 text-accent-foreground md:-mx-[30px] md:px-[30px] lg:mx-0 lg:grid-cols-[200px_1fr] lg:gap-8 lg:px-8 lg:py-9"
    >
      <div className="flex items-start justify-between gap-4 lg:flex-col lg:justify-start">
        <h2 className="font-display text-[28px] uppercase leading-[1.05] lg:text-[30px]">{title}</h2>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white",
            inPlay ? "bg-[#d71920]" : "bg-[#06051e]",
          )}
        >
          {inPlay ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> : null}
          {inPlay ? "Live" : "Final"}
        </span>
      </div>
      <ul className="flex list-disc flex-col gap-1.5 pl-4 text-[15px] leading-relaxed marker:text-accent-foreground/60">
        {lines.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </section>
  );
}
