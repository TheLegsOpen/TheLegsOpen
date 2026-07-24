import Link from "next/link";

import { playerSlug, surnameFirst } from "@/lib/utils";
import type { StatCategory } from "@/lib/statistics";

const RUNNERS_UP_COUNT = 3;

export function StatCategoryCard({ category }: { category: StatCategory }) {
  const [leader, ...rest] = category.rows;
  if (!leader) return null;
  const runnersUp = rest.slice(0, RUNNERS_UP_COUNT);

  return (
    <div className="flex flex-col gap-px overflow-hidden">
      <div className="flex items-center justify-between bg-surface-dark-foreground/5 px-4 py-3">
        <h3 className="font-display text-sm font-bold uppercase tracking-wide">{category.title}</h3>
        <span className="text-xs uppercase tracking-wide text-surface-dark-foreground/50">{category.columnLabel}</span>
      </div>

      <div className="flex items-center justify-between gap-4 bg-primary px-4 py-5 text-primary-foreground">
        <div className="flex items-center gap-3">
          <span className="font-display text-lg font-bold">1st</span>
          <span className="text-xs text-primary-foreground/60">{leader.player.countryCode}</span>
          <Link href={`/players/${playerSlug(leader.player)}`} className="font-display text-lg font-bold hover:underline">
            {leader.player.name}
          </Link>
        </div>
        <span className="shrink-0 rounded bg-accent px-3 py-1.5 text-sm font-bold tabular-nums text-accent-foreground">
          {leader.display}
        </span>
      </div>

      {runnersUp.map((row, index) => (
        <div key={row.player.id} className="flex items-center justify-between gap-4 bg-accent/90 px-4 py-3 text-accent-foreground">
          <div className="flex items-center gap-3 text-sm">
            <span className="w-5 tabular-nums">{index + 2}</span>
            <span className="text-xs text-accent-foreground/70">{row.player.countryCode}</span>
            <Link href={`/players/${playerSlug(row.player)}`} className="font-medium hover:underline">
              {surnameFirst(row.player.name)}
            </Link>
          </div>
          <span className="text-sm font-semibold tabular-nums">{row.display}</span>
        </div>
      ))}
    </div>
  );
}
