import Link from "next/link";
import { Trophy } from "lucide-react";

import { PlaceholderArt } from "@/components/shared/placeholder-art";
import { CountryFlag } from "@/components/shared/country-flag";
import { cn, playerSlug } from "@/lib/utils";
import type { Player } from "@/types/player";

interface PlayerCardProps {
  player: Player;
  /** Years this player has won The Legs Open, if any — shows a champion badge when set. */
  championYears?: number[];
  /** Champion Badge (Site Theme global). Falls back to a trophy icon when not set. */
  championLogoUrl?: string;
}

export function PlayerCard({ player, championYears, championLogoUrl }: PlayerCardProps) {
  return (
    <Link href={`/players/${playerSlug(player)}`} className="group flex flex-col gap-3">
      <div className="relative">
        <PlaceholderArt
          label={`${player.name} portrait`}
          imageUrl={player.photoUrl}
          tone="slate"
          ratio="3/4"
          className={cn(
            "transition-transform duration-300 ease-standard group-hover:scale-[1.02]",
            championYears?.length ? "ring-2 ring-accent" : undefined,
          )}
        />
        <span className="absolute right-2 top-2 flex items-center gap-1 rounded bg-black/60 px-1.5 py-1 text-white">
          <CountryFlag code={player.countryCode} className="h-2.5 w-4" />
        </span>
        {championYears?.length ? (
          <span className="absolute left-2 top-2 flex flex-col items-center gap-1">
            {championLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={championLogoUrl} alt="" aria-hidden="true" className="h-10 w-10 object-contain drop-shadow-md" />
            ) : (
              <Trophy className="h-8 w-8 text-white drop-shadow-md" aria-hidden="true" />
            )}
            {championYears.map((year) => (
              <span key={year} className="text-sm font-bold leading-none tabular-nums text-white drop-shadow-md">
                {year}
              </span>
            ))}
          </span>
        ) : null}
      </div>
      <div>
        <p className="font-display font-bold leading-tight group-hover:text-primary">{player.name}</p>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{player.country}</p>
      </div>
    </Link>
  );
}
