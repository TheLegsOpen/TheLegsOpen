"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/container";
import { PlaceholderArt } from "@/components/shared/placeholder-art";
import { SITE } from "@/constants/site";
import { ordinal } from "@/lib/utils";
import type { getCurrentChampion } from "@/lib/data/players";

interface HeroProps {
  currentChampion: Awaited<ReturnType<typeof getCurrentChampion>>;
}

export function Hero({ currentChampion: CURRENT_CHAMPION }: HeroProps) {
  return (
    <section className="relative h-[85vh] min-h-[520px] w-full overflow-hidden">
      <PlaceholderArt
        label={`${CURRENT_CHAMPION.player.name} celebrates at ${CURRENT_CHAMPION.venue}`}
        tone="navy"
        fill
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />

      <Container className="relative z-10 flex h-full flex-col justify-end gap-5 pb-14 text-white sm:pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex max-w-2xl flex-col gap-5"
        >
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
            {ordinal(SITE.currentChampionshipNumber - 1)} {SITE.name} Champion
          </span>
          <h1 className="font-display font-bold text-display-xl text-balance">
            {CURRENT_CHAMPION.player.name.split(" ")[0]}&rsquo;s coastal masterclass
          </h1>
          <p className="max-w-lg text-lg text-white/85">
            {CURRENT_CHAMPION.player.name} held off the chasing pack at {CURRENT_CHAMPION.venue} to lift the
            Claret Vase for the first time, closing at {Math.abs(CURRENT_CHAMPION.scoreToPar)} under par.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="accent" size="lg">
              <Link href={`/latest/${CURRENT_CHAMPION.articleSlug}`}>Read the story</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-white/40 text-white hover:bg-white/10">
              <Link href="/leaderboard">View full leaderboard</Link>
            </Button>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
