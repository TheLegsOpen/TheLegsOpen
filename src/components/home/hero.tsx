"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/container";
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
      <Container className="grid grid-cols-1 gap-3 py-3 lg:grid-cols-[1fr_320px]">
        <div className="relative h-full min-h-[380px] w-full overflow-hidden">
          <PlaceholderArt
            label={`${CURRENT_CHAMPION.winnerName} celebrates at ${CURRENT_CHAMPION.venueName}`}
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
                {ordinal(CURRENT_CHAMPION.championshipNumber)} {SITE.name} Champion
              </span>
              <h1 className="font-display font-bold text-display-lg text-balance">
                {CURRENT_CHAMPION.winnerName.split(" ")[0]}&rsquo;s coastal masterclass
              </h1>
              <p className="max-w-lg text-sm text-white/85 sm:text-base">
                {CURRENT_CHAMPION.winnerName} held off the chasing pack at {CURRENT_CHAMPION.venueName} to lift the
                Claret Vase for the first time, closing at {Math.abs(CURRENT_CHAMPION.scoreToPar)} under par.
              </p>
              <div className="flex flex-wrap gap-3 pt-1">
                <Button asChild variant="accent" size="default">
                  <Link href={`/latest/${CURRENT_CHAMPION.articleSlug}`}>Read the story</Link>
                </Button>
                <Button asChild variant="outline" size="default" className="border-white/40 text-white hover:bg-white/10">
                  <Link href="/leaderboard">View full leaderboard</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="overflow-hidden border border-surface-dark-foreground/15">
            <SponsorTimeWidget config={clockConfig} />
          </div>
          {weather ? (
            <div className="overflow-hidden border border-surface-dark-foreground/15">
              <WeatherWidget weather={weather} />
            </div>
          ) : null}
        </div>
      </Container>
    </section>
  );
}
