import Link from "next/link";

import { CountryFlag } from "@/components/shared/country-flag";
import { PlaceholderArt } from "@/components/shared/placeholder-art";
import { formatToPar } from "@/lib/leaderboard";
import { cn, playerSlug, splitSurnameFirst } from "@/lib/utils";
import type { RecordsData } from "@/lib/data/records";
import type { Player } from "@/types/player";

interface RecordRow {
  name: string;
  value: string;
  detail?: string;
}

interface RecordCard {
  title: string;
  rows: RecordRow[];
}

function ageLabel(age: { years: number }): string {
  return `${age.years} yrs`;
}

/**
 * PREVIEW (30): the headline records in the Statistics leader-card style -- the record holder
 * featured (cut-out photo, name, flag, the record in a yellow box, where and when), the next best
 * two in slim rows beneath, two cards to a row.
 */
export function RecordsBoardNext({ records, players }: { records: RecordsData; players: Player[] }) {
  const byName = new Map(players.map((p) => [p.name, p]));
  const where = (r: { venueName?: string; year?: number }) => [r.venueName, r.year].filter(Boolean).join(" · ");

  const cards: RecordCard[] = [
    { title: "Most Legs Open titles", rows: records.mostVictoriesMain.slice(0, 3).map((r) => ({ name: r.name, value: String(r.count), detail: r.years.join(", ") })) },
    { title: "Most Stableford titles", rows: records.mostVictoriesStableford.slice(0, 3).map((r) => ({ name: r.name, value: String(r.count), detail: r.years.join(", ") })) },
    { title: "Most Scratch titles", rows: records.mostVictoriesScratch.slice(0, 3).map((r) => ({ name: r.name, value: String(r.count), detail: r.years.join(", ") })) },
    { title: "Lowest winning score", rows: records.lowestWinningToPar.slice(0, 3).map((r) => ({ name: r.name, value: formatToPar(r.value), detail: where(r) })) },
    { title: "Lowest round", rows: records.lowestScoreInRound.slice(0, 3).map((r) => ({ name: r.name, value: String(r.value), detail: where(r) })) },
    { title: "Largest winning margin", rows: records.largestMargin.slice(0, 3).map((r) => ({ name: r.name, value: `${r.margin}`, detail: where(r) })) },
    { title: "Greatest comeback after nine", rows: records.greatestComebackAfter9.slice(0, 3).map((r) => ({ name: r.name, value: `${r.deficit}`, detail: where(r) })) },
    { title: "Largest lead", rows: records.largestLeadByAnyPlayer.slice(0, 3).map((r) => ({ name: r.name, value: `${r.margin}`, detail: `${where(r)} · after ${r.afterHole}` })) },
    { title: "Most appearances", rows: records.mostAppearances.slice(0, 3).map((r) => ({ name: r.name, value: String(r.appearances) })) },
    { title: "Oldest champion", rows: records.oldestChampion.slice(0, 3).map((r) => ({ name: r.name, value: ageLabel(r.age), detail: String(r.year) })) },
    { title: "Youngest champion", rows: records.youngestChampion.slice(0, 3).map((r) => ({ name: r.name, value: ageLabel(r.age), detail: String(r.year) })) },
    { title: "Oldest competitor", rows: records.oldestCompetitor.slice(0, 3).map((r) => ({ name: r.name, value: ageLabel(r.age) })) },
    { title: "Youngest competitor", rows: records.youngestCompetitor.slice(0, 3).map((r) => ({ name: r.name, value: ageLabel(r.age) })) },
    { title: "Most used venues", rows: records.courseHostCounts.slice(0, 3).map((r) => ({ name: r.venueName, value: String(r.count), detail: r.years.join(", ") })) },
  ].filter((c) => c.rows.length > 0);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      {cards.map((card) => (
        <div key={card.title} className="flex flex-col overflow-hidden border border-surface-dark-foreground/15">
          <div className="bg-primary px-4 py-3">
            <h3 className="font-display text-lg font-bold uppercase tracking-wide text-primary-foreground">{card.title}</h3>
          </div>
          {card.rows.map((row, index) => {
            const player = byName.get(row.name);
            if (index === 0) {
              const { firstName, surname } = splitSurnameFirst(row.name);
              return (
                <div key={row.name + index} className="flex items-center gap-4 border-b border-surface-dark-foreground/15 bg-primary px-4 py-4 text-primary-foreground">
                  {player?.photoUrl ? (
                    <span className="relative hidden h-[84px] w-[70px] shrink-0 overflow-hidden sm:block" aria-hidden="true">
                      <PlaceholderArt label="" imageUrl={player.photoUrl} tone="navy" blendBlack fill fit="contain-bottom" sizes="70px" />
                    </span>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    {player ? (
                      <Link href={`/players/${playerSlug(player)}`} className="block hover:underline">
                        <span className="block truncate font-menu text-[15px] leading-tight">{firstName}</span>
                        <span className="flex items-center gap-2 font-menu text-[24px] font-bold uppercase leading-none">
                          <span className="truncate">{surname}</span>
                          <CountryFlag code={player.countryCode} className="h-3.5 w-5 shrink-0" />
                        </span>
                      </Link>
                    ) : (
                      <span className="block font-menu text-[24px] font-bold uppercase leading-none">{row.name}</span>
                    )}
                    {row.detail ? <span className="mt-1 block truncate text-xs text-primary-foreground/60">{row.detail}</span> : null}
                  </div>
                  <span className="shrink-0 bg-accent px-3 py-2 font-menu text-[22px] font-bold tabular-nums leading-none text-accent-foreground">{row.value}</span>
                </div>
              );
            }
            return (
              <div
                key={row.name + index}
                className={cn("flex items-center justify-between gap-4 border-b border-surface-dark-foreground/15 bg-accent/90 px-4 py-3 text-sm text-accent-foreground last:border-0")}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="w-6 tabular-nums">{index + 1}</span>
                  {player ? <CountryFlag code={player.countryCode} className="h-3 w-4 shrink-0" /> : null}
                  <span className="truncate font-medium">{row.name}</span>
                  {row.detail ? <span className="hidden truncate text-xs opacity-70 sm:inline">{row.detail}</span> : null}
                </span>
                <span className="shrink-0 font-bold tabular-nums">{row.value}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
