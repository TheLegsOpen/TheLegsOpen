import Link from "next/link";

import { Container } from "@/components/shared/container";
import { PlaceholderArt } from "@/components/shared/placeholder-art";

export interface VenueChampion {
  key: string;
  name: string;
  slug?: string;
  photoUrl?: string;
  years: number[];
}

// Their card is a flat 400 x 600 with the photograph filling it and every piece of type laid over
// the picture. Ours was 327 x 518 with a 3:4 photo and the text stacked underneath it, which is
// what made the two pages look least alike.
const CARD_WIDTH = 400;
const CARD_HEIGHT = 600;

// Theirs splits the name across two lines -- "Francesco" in 26/400, then "MOLINARI" in 26/700
// uppercase. A single-word name has no forename to set, so it takes the bold line on its own
// rather than leaving an empty one above it.
function splitName(name: string): { forename: string; surname: string } {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return { forename: "", surname: name.trim() };
  const surname = parts.pop() as string;
  return { forename: parts.join(" "), surname };
}

export function VenueChampions({ venueName, champions }: { venueName: string; champions: VenueChampion[] }) {
  if (champions.length === 0) return null;

  return (
    // White across the full width, which lifts it off the page's own #F9FAFB. On their site this
    // band is white against a white page, so it reads as padding rather than a panel; here it is
    // the faint step that separates the champions from the navy strip above.
    <section className="w-full bg-white">
      <Container className="pb-20">
        <div className="pb-[65px] pt-[75px]">
          <h2 className="font-menu text-[24px] font-bold uppercase leading-[27.6px] tracking-[1.6px] text-black">Champion Golfers at {venueName}</h2>
        </div>

        {/* Wrapping flex rather than a 4-column grid: their cards are exactly 400 wide and do not
            stretch to fill a row, and at 1366 that is three across with the remainder left over,
            which is what theirs looks like mid-carousel. */}
        <div className="flex flex-wrap gap-5">
          {champions.map((champion) => {
            const { forename, surname } = splitName(champion.name);
            return (
              <div
                key={champion.key}
                className="relative w-full max-w-full overflow-hidden bg-primary sm:w-[400px]"
                style={{ height: CARD_HEIGHT, maxWidth: CARD_WIDTH }}
              >
                <PlaceholderArt label={`${champion.name} portrait`} imageUrl={champion.photoUrl} tone="slate" blendBlack fill sizes="400px" />
                {/* Both ends of the card need their own gradient: the year sits at the top over
                    whatever the sky is, the name at the foot over whatever the fairway is. */}
                <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/70 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-black/85 to-transparent" />

                <p className="absolute left-[30px] top-[30px] font-menu text-[13px] font-bold leading-[14.95px] tracking-[1.6px] text-white">
                  {champion.years.join(", ")}
                </p>

                <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 px-[30px] pb-[30px]">
                  {forename ? <span className="font-menu text-[26px] font-normal leading-[29.9px] tracking-[2.4px] text-white">{forename}</span> : null}
                  <span className="font-menu text-[26px] font-bold uppercase leading-[26px] tracking-[1.6px] text-white">{surname}</span>
                  {champion.slug ? (
                    <Link
                      href={`/players/${champion.slug}`}
                      className="mt-3 font-menu text-[14px] font-bold uppercase leading-[16.1px] tracking-[1.2px] text-white hover:underline"
                    >
                      View profile
                    </Link>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
