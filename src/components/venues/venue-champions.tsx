import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

import { Container } from "@/components/shared/container";
import { CountryFlag } from "@/components/shared/country-flag";
import { PlaceholderArt } from "@/components/shared/placeholder-art";

export interface VenueChampion {
  key: string;
  name: string;
  slug?: string;
  countryCode?: string;
  photoUrl?: string;
  /** Every Legs Open this player has won, at any venue, oldest first. */
  years: number[];
}

// Their card is a flat 400 x 600 with the photograph filling it and every piece of type laid over
// the picture.
const CARD_WIDTH = 400;
const CARD_HEIGHT = 600;

// Theirs splits the name across two lines -- "Francesco" in regular, then "MOLINARI" in bold
// uppercase. A single-word name has no forename to set, so it takes the bold line on its own.
function splitName(name: string): { forename: string; surname: string } {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return { forename: "", surname: name.trim() };
  const surname = parts.pop() as string;
  return { forename: parts.join(" "), surname };
}

/**
 * "Champion Golfers at [venue]", after theopen.com's (e.g. /carnoustie-2029): one card per
 * champion, the Open logo top left over every year they have won it stacked beneath, then the flag,
 * the name and View Profile at the foot. The whole card opens the profile, not just the words.
 */
export function VenueChampions({ venueName, champions, logoUrl }: { venueName: string; champions: VenueChampion[]; logoUrl?: string }) {
  if (champions.length === 0) return null;

  return (
    <section className="w-full bg-white">
      <Container className="pb-20">
        <div className="pb-[65px] pt-[75px]">
          <h2 className="font-menu text-[24px] font-bold uppercase leading-[27.6px] tracking-[1.6px] text-black">Champion Golfers at {venueName}</h2>
        </div>

        <div className="flex flex-wrap gap-5">
          {champions.map((champion) => {
            const { forename, surname } = splitName(champion.name);
            const body = (
              <>
                <PlaceholderArt
                  label={`${champion.name} portrait`}
                  imageUrl={champion.photoUrl}
                  tone="slate"
                  blendBlack
                  fill
                  sizes="400px"
                  className="transition-transform duration-500 ease-standard group-hover:scale-[1.03]"
                />
                {/* Both ends need their own shading: the logo and years sit at the top over whatever
                    the sky is, the name at the foot over whatever the fairway is. */}
                <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-black/70 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#06051e]/95 via-[#06051e]/60 to-transparent" />

                <div className="absolute left-[30px] top-[30px] flex flex-col items-center gap-2 text-white">
                  {logoUrl ? (
                    // next/image: the site's 102x105 symbol, shown at 44px.
                    <Image src={logoUrl} alt="" aria-hidden="true" width={44} height={45} className="h-[45px] w-[44px] object-contain" />
                  ) : null}
                  <div className="flex flex-col items-center">
                    {champion.years.map((year) => (
                      <span key={year} className="font-menu text-[22px] font-bold leading-[1.05] tracking-[0.6px]">
                        {year}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="absolute inset-x-0 bottom-0 flex flex-col px-[30px] pb-[30px] text-white">
                  {champion.countryCode ? <CountryFlag code={champion.countryCode} className="mb-4 h-[18px] !w-[26px]" /> : null}
                  {forename ? <span className="font-menu text-[30px] font-normal leading-[1.1] tracking-[0.6px]">{forename}</span> : null}
                  <span className="font-menu text-[30px] font-bold uppercase leading-[1.1] tracking-[0.6px]">{surname}</span>
                  {champion.slug ? (
                    <span className="mt-5 inline-flex items-center gap-3 font-menu text-[15px] font-bold uppercase leading-none tracking-[1.2px] group-hover:underline">
                      View profile <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
                    </span>
                  ) : null}
                </div>
              </>
            );
            const cardClass = "group relative block w-full max-w-full overflow-hidden bg-primary sm:w-[400px]";
            const cardStyle = { height: CARD_HEIGHT, maxWidth: CARD_WIDTH };
            return champion.slug ? (
              <Link
                key={champion.key}
                href={`/players/${champion.slug}`}
                aria-label={`${champion.name}, Champion Golfer of the Year ${champion.years.join(" and ")}: view profile`}
                className={`${cardClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2`}
                style={cardStyle}
              >
                {body}
              </Link>
            ) : (
              <div key={champion.key} className={cardClass} style={cardStyle}>
                {body}
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
