"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { SITE } from "@/constants/site";
import { ordinal } from "@/lib/utils";
import type { ChampionshipWinner } from "@/types/championship";

const decadeOf = (year: number) => Math.floor(year / 10) * 10;

/** "2020 - 2029", the way the dropdown on theopen.com/previous-opens reads. */
const decadeLabel = (decade: number) => `${decade} - ${decade + 9}`;

/**
 * "2019 - 2010" -- the load-earlier button counts down where the dropdown counts up. That is
 * genuinely how The Open labels the two, and it reads correctly in both places: the dropdown is
 * naming a decade, the button is describing a direction of travel.
 */
const earlierLabel = (decade: number) => `${decade + 9} - ${decade}`;

/** Surname carries the weight, as on their card. A one-word name is all surname. */
function splitName(name: string) {
  const parts = name.trim().split(/\s+/);
  const surname = parts.pop() ?? name;
  return { forename: parts.join(" "), surname };
}

export function PreviousOpensTimeline({ history }: { history: ChampionshipWinner[] }) {
  // Which championship each year was -- counted from the first ever recorded rather than stored,
  // so it stays right if an older one is ever added behind them.
  const ordinals = useMemo(() => {
    const map = new Map<number, number>();
    [...history]
      .sort((a, b) => a.year - b.year)
      .forEach((championship, index) => map.set(championship.year, index + 1));
    return map;
  }, [history]);

  const decades = useMemo(
    () => Array.from(new Set(history.map((c) => decadeOf(c.year)))).sort((a, b) => b - a),
    [history],
  );

  // Open on the decade we are actually in, which is the one people came to look at. It used to
  // open on "All decades", so the first thing on the page was the full roll of honour and the
  // filter had nothing to do. Falls back to the most recent decade that has championships in it,
  // so the page still has something in it during a gap year.
  const thisDecade = decadeOf(new Date().getFullYear());
  const opening = decades.includes(thisDecade) ? thisDecade : (decades[0] ?? thisDecade);

  const [newest, setNewest] = useState(opening);
  const [oldest, setOldest] = useState(opening);

  const shown = history
    .filter((c) => decadeOf(c.year) <= newest && decadeOf(c.year) >= oldest)
    .sort((a, b) => b.year - a.year);

  const earlier = decades.find((d) => d < oldest);

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 border-b border-border pb-6">
        <label htmlFor="decade-filter" className="font-sans text-[14px] font-bold text-muted-foreground">
          Select decade
        </label>
        <select
          id="decade-filter"
          value={newest}
          onChange={(event) => {
            const chosen = Number(event.target.value);
            setNewest(chosen);
            setOldest(chosen);
          }}
          className="h-10 rounded-md border border-border bg-background px-3 font-sans text-[14px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {decades.map((d) => (
            <option key={d} value={d}>
              {decadeLabel(d)}
            </option>
          ))}
        </select>
      </div>

      {shown.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">No championships recorded for that decade.</p>
      ) : (
        <div className="flex flex-col">
          {shown.map((c) => {
            const number = ordinals.get(c.year);
            const winner = c.winnerName ? splitName(c.winnerName) : null;
            return (
              <article
                key={c.year}
                className="grid grid-cols-[72px_1fr] items-start gap-x-6 gap-y-3 border-b border-border py-6 sm:grid-cols-[100px_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-8"
              >
                <time dateTime={String(c.year)} className="font-menu text-[24px] leading-[24px] text-foreground">
                  {c.year}
                </time>
                <div className="flex flex-col gap-1">
                  {number ? (
                    <p className="font-menu text-[14px] font-bold uppercase leading-[16.1px] tracking-[2px] text-muted-foreground">
                      The {ordinal(number)} {SITE.shortName}
                    </p>
                  ) : null}
                  <p className="font-menu text-[32px] leading-[36.8px] tracking-[0.8px] text-foreground">{c.venueName}</p>
                </div>
                <div className="col-start-2 flex flex-col gap-1 sm:col-start-auto">
                  <p className="font-menu text-[14px] uppercase leading-[16.1px] tracking-[1.6px] text-foreground">
                    Champion golfer of the year
                  </p>
                  <p className="font-sans text-[16px] leading-[24px] text-muted-foreground">
                    {winner ? (
                      <>
                        {winner.forename ? `${winner.forename} ` : ""}
                        <span className="font-bold">{winner.surname}</span>
                      </>
                    ) : (
                      "TBD"
                    )}
                  </p>
                </div>
                <Link
                  href={`/previous-opens/${c.year}`}
                  // #2269AB is the blue The Open uses for this link. It is deliberately outside
                  // our palette -- nothing else on the site is this colour -- so it stays a
                  // literal here rather than becoming a token that invites reuse.
                  className="col-start-2 w-fit font-sans text-[14px] font-bold uppercase leading-[20.02px] tracking-[0.2px] text-[#2269AB] transition-colors hover:text-accent sm:col-start-auto"
                >
                  Info
                </Link>
              </article>
            );
          })}
        </div>
      )}

      {earlier !== undefined ? (
        <div className="flex justify-center pt-8">
          <button
            type="button"
            onClick={() => setOldest(earlier)}
            className="border border-border px-6 py-3 font-sans text-[17px] font-bold uppercase leading-[20.4px] tracking-[0.3px] text-foreground transition-colors hover:border-accent hover:text-accent"
          >
            {earlierLabel(earlier)}
          </button>
        </div>
      ) : null}
    </div>
  );
}
