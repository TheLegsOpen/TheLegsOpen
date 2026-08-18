import Link from "next/link";

import { PlaceholderArt } from "@/components/shared/placeholder-art";

export interface VenueChampion {
  key: string;
  name: string;
  slug?: string;
  photoUrl?: string;
  years: number[];
}

export function VenueChampions({ venueName, champions }: { venueName: string; champions: VenueChampion[] }) {
  if (champions.length === 0) return null;

  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-display font-bold text-2xl">Champion Golfers at {venueName}</h2>
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
        {champions.map((champion) => (
          <div key={champion.key} className="flex flex-col gap-3">
            <div className="relative aspect-[3/4] w-full overflow-hidden bg-primary">
              <PlaceholderArt
                label={`${champion.name} portrait`}
                imageUrl={champion.photoUrl}
                tone="slate"
                blendBlack
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              />
            </div>
            <div>
              <p className="font-display text-lg font-bold uppercase leading-tight">{champion.name}</p>
              <p className="text-sm font-semibold text-accent">{champion.years.join(", ")}</p>
            </div>
            {champion.slug ? (
              <Link
                href={`/players/${champion.slug}`}
                className="text-xs font-bold uppercase tracking-wide text-accent hover:underline"
              >
                View profile
              </Link>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
