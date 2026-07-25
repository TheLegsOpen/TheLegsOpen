import Link from "next/link";
import { Star } from "lucide-react";

import { PlaceholderArt } from "@/components/shared/placeholder-art";
import { CountryFlag } from "@/components/shared/country-flag";
import { cn, playerSlug } from "@/lib/utils";
import type { TeeTimeEntry } from "@/types/championship";
import type { Player } from "@/types/player";

function PlayerChip({ player, isFavorite, isDark }: { player: Player; isFavorite: boolean; isDark: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-2 text-center sm:flex-row sm:text-left">
      <PlaceholderArt
        label={`${player.name} portrait`}
        imageUrl={player.photoUrl}
        tone="slate"
        ratio="1/1"
        className="h-14 w-14 shrink-0 rounded-full"
      />
      <div>
        <Link
          href={`/players/${playerSlug(player)}`}
          className="flex items-center justify-center gap-1.5 font-display font-bold leading-tight hover:text-accent hover:underline sm:justify-start"
        >
          {isFavorite ? <Star className="h-3.5 w-3.5 shrink-0 fill-accent text-accent" aria-hidden="true" /> : null}
          {player.name}
        </Link>
        <p
          className={cn(
            "flex items-center justify-center gap-1.5 text-xs uppercase tracking-wide sm:justify-start",
            isDark ? "text-surface-dark-foreground/60" : "text-muted-foreground",
          )}
        >
          <CountryFlag code={player.countryCode} className="h-2.5 w-3.5" />
          {player.country}
        </p>
      </div>
    </div>
  );
}

export function MatchupCard({
  group,
  favorites = [],
  tone = "light",
}: {
  group: TeeTimeEntry;
  favorites?: string[];
  tone?: "light" | "dark";
}) {
  const isDark = tone === "dark";
  const hasFavorite = group.players.some((player) => favorites.includes(player.id));

  return (
    <div
      className={cn(
        "flex flex-col gap-4 border p-4 sm:flex-row sm:items-center sm:gap-6",
        hasFavorite ? "border-accent" : isDark ? "border-surface-dark-foreground/15" : "border-border",
      )}
    >
      <div className="flex shrink-0 flex-row items-center gap-2 sm:w-24 sm:flex-col sm:items-start sm:gap-1">
        <span className="font-display text-lg font-bold tabular-nums">{group.time}</span>
        <span className={cn("text-xs uppercase tracking-wide", isDark ? "text-surface-dark-foreground/60" : "text-muted-foreground")}>
          {group.tee} Tee
        </span>
      </div>
      <div
        className={cn(
          "flex flex-1 flex-col gap-4 sm:flex-row sm:items-center sm:divide-x",
          isDark ? "sm:divide-surface-dark-foreground/15" : "sm:divide-border",
        )}
      >
        {group.players.map((player, index) => (
          <div key={player.id} className={cn("flex-1", index > 0 && "sm:pl-6")}>
            <PlayerChip player={player} isFavorite={favorites.includes(player.id)} isDark={isDark} />
          </div>
        ))}
      </div>
    </div>
  );
}
