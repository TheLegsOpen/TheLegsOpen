import Link from "next/link";

import { PlaceholderArt } from "@/components/shared/placeholder-art";
import { playerSlug } from "@/lib/utils";
import type { Player } from "@/types/player";

export function PlayerCard({ player }: { player: Player }) {
  return (
    <Link href={`/players/${playerSlug(player)}`} className="group flex flex-col gap-3">
      <div className="relative">
        <PlaceholderArt
          label={`${player.name} portrait`}
          imageUrl={player.photoUrl}
          tone="slate"
          ratio="3/4"
          className="transition-transform duration-300 ease-standard group-hover:scale-[1.02]"
        />
        <span className="absolute right-2 top-2 rounded bg-black/60 px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
          {player.countryCode}
        </span>
      </div>
      <div>
        <p className="font-display font-bold leading-tight group-hover:text-primary">
          {player.name}
          {player.isAmateur ? <span className="ml-1 text-xs font-normal text-muted-foreground">(a)</span> : null}
        </p>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{player.country}</p>
      </div>
    </Link>
  );
}
