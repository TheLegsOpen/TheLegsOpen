import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/container";
import { Countdown } from "@/components/shared/countdown";
import { SponsorTimeWidget } from "@/components/shared/sponsor-time-widget";
import { SITE } from "@/constants/site";

const BALLOT_CLOSE_DATE = "2026-10-15T17:00:00Z";

export function FeaturedBallotCard() {
  return (
    <section className="-mt-10 sm:-mt-14">
      <Container className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px] lg:items-stretch">
        <div className="flex flex-col gap-6 rounded-xl bg-primary px-6 py-8 text-primary-foreground shadow-card-hover sm:flex-row sm:items-center sm:justify-between sm:px-10 sm:py-10">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
              {SITE.currentChampionshipNumber}th {SITE.name}
            </span>
            <h2 className="font-display font-bold text-display-sm text-balance">
              Ballot applications close soon for {SITE.nextVenue}
            </h2>
            <p className="max-w-md text-sm text-primary-foreground/75">
              Apply now for your chance at tickets to next year&rsquo;s championship. One Club members get
              priority access.
            </p>
          </div>
          <div className="flex flex-col items-start gap-4 sm:items-end">
            <Countdown targetIso={BALLOT_CLOSE_DATE} />
            <Button asChild variant="accent" size="lg">
              <Link href="/tickets-and-hospitality">Enter the ballot</Link>
            </Button>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl shadow-card-hover">
          <SponsorTimeWidget />
        </div>
      </Container>
    </section>
  );
}
