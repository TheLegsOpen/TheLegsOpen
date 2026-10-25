"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/container";
import { SectionGrid } from "@/components/shared/section-grid";
import { PlaceholderArt } from "@/components/shared/placeholder-art";
import { SponsorTimeWidget } from "@/components/shared/sponsor-time-widget";
import { WeatherWidget } from "@/components/shared/weather-widget";
import { SITE } from "@/constants/site";
import { ordinal } from "@/lib/utils";
import type { CurrentChampion } from "@/lib/data/homepage-settings";
import type { SponsorClock } from "@/lib/data/sponsor-clock";
import type { VenueWeather } from "@/lib/data/weather";

interface HeroProps {
  currentChampion: CurrentChampion;
  clockConfig: SponsorClock;
  weather: VenueWeather | null;
}

export function Hero({ currentChampion: CURRENT_CHAMPION, clockConfig, weather }: HeroProps) {
  return (
    <section className="w-full bg-surface-dark">
      <Container className="py-3">
        {/* The Open's hero split, to its own numbers: an 891 headline beside a 455 column at a
            20px gutter. It was 1fr + a hardcoded 320px at a 12px gap, which belonged to no grid
            on the site -- this is the same main-side proportion every other band uses.
            The clock takes the 140 The Open gives that slot.

            The height is theirs though, not ours. Their column runs 361, which leaves 201 for the
            box below the clock; our weather needs 315 -- a conditions panel, a six-column forecast
            and a today/week toggle -- so 361 would clip 116px of it, silently, because the box
            hides its overflow. Trimming every scrap of padding out of the widget recovers 28px,
            which is not the difference.

            So the sidebar sets the height and the headline follows it: grid items stretch, so the
            two foot level without either being told a number. It costs about 116px against The
            Open's hero, pushing the leaderboard down by that much. The alternative was deleting a
            forecast to save vertical space during a championship. */}
        <SectionGrid layout="main-side">
          <div className="relative min-h-[380px] w-full overflow-hidden">
            <PlaceholderArt
              label={CURRENT_CHAMPION.imageLabel ?? `${CURRENT_CHAMPION.winnerName} celebrates at ${CURRENT_CHAMPION.venueName}`}
              imageUrl={CURRENT_CHAMPION.imageUrl}
              tone="navy"
              fill
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />
  
            <div className="relative z-10 flex h-full flex-col justify-end gap-4 p-6 text-white sm:p-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="flex max-w-xl flex-col gap-3"
              >
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                  The {ordinal(CURRENT_CHAMPION.championshipNumber)} {SITE.shortName} Champion
                </span>
                <h1 className="font-display text-[36px] font-semibold leading-[normal] tracking-[0.864px] text-white text-balance">
                  {CURRENT_CHAMPION.articleTitle}
                </h1>
                <p className="max-w-lg font-sans text-[20px] font-normal leading-[24px] tracking-[0px] text-white">
                  {CURRENT_CHAMPION.articleDek}
                </p>
                <div className="flex flex-wrap gap-3 pt-1">
                  <Button
                    asChild
                    variant="accent"
                    size="default"
                    className="font-sans text-[17px] font-light uppercase leading-[20.4px] tracking-[0.3px]"
                  >
                    <Link href={`/latest/${CURRENT_CHAMPION.articleSlug}`}>{CURRENT_CHAMPION.primaryButtonLabel}</Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="default"
                    className="border-white/40 font-sans text-[17px] font-light uppercase leading-[20.4px] tracking-[0.3px] text-white hover:bg-white/10"
                  >
                    <Link href="/leaderboard">{CURRENT_CHAMPION.secondaryButtonLabel}</Link>
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
  
          <div className="flex flex-col gap-5">
            <div className="overflow-hidden border border-surface-dark-foreground/15 lg:h-[140px] lg:shrink-0">
              <SponsorTimeWidget config={clockConfig} />
            </div>
            {weather ? (
              // No height: what this comes to is what the hero comes to. Pinning it is what
              // clipped the forecast.
              <div className="overflow-hidden border border-surface-dark-foreground/15">
                <WeatherWidget weather={weather} />
              </div>
            ) : null}
          </div>
        </SectionGrid>
      </Container>
    </section>
  );
}
