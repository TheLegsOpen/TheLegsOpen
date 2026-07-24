import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { Container } from "@/components/shared/container";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PlaceholderArt } from "@/components/shared/placeholder-art";
import { CHAMPIONSHIP_HISTORY } from "@/data/championships";
import { PLAYERS } from "@/data/players";
import { playerSlug } from "@/lib/utils";
import { formatToPar } from "@/lib/leaderboard";

interface YearPageProps {
  params: Promise<{ year: string }>;
}

export function generateStaticParams() {
  return CHAMPIONSHIP_HISTORY.map((c) => ({ year: String(c.year) }));
}

export async function generateMetadata({ params }: YearPageProps): Promise<Metadata> {
  const { year } = await params;
  const championship = CHAMPIONSHIP_HISTORY.find((c) => String(c.year) === year);
  if (!championship) return {};
  return {
    title: `${championship.year} — ${championship.venueName}`,
    description: `${championship.winnerName} won the ${championship.year} Legs Open at ${championship.venueName}.`,
  };
}

export default async function PreviousOpenYearPage({ params }: YearPageProps) {
  const { year } = await params;
  const championship = CHAMPIONSHIP_HISTORY.find((c) => String(c.year) === year);
  if (!championship) notFound();

  const winnerPlayer = PLAYERS.find((p) => p.name === championship.winnerName);

  return (
    <Container className="flex flex-col gap-10 py-10 sm:py-14">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Previous Opens", href: "/previous-opens" },
          { label: String(championship.year) },
        ]}
      />

      <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
        <div className="flex flex-col gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{championship.year}</span>
          <h1 className="font-display font-bold text-display-lg text-balance">{championship.venueName}</h1>
          <p className="text-lg text-muted-foreground">
            Won by{" "}
            {winnerPlayer ? (
              <Link href={`/players/${playerSlug(winnerPlayer)}`} className="font-semibold text-primary hover:underline">
                {championship.winnerName}
              </Link>
            ) : (
              <span className="font-semibold text-foreground">{championship.winnerName}</span>
            )}{" "}
            of {championship.winnerCountry}
          </p>
        </div>
        <PlaceholderArt
          label={`${championship.winnerName} at ${championship.venueName}`}
          tone="navy"
          ratio="4/3"
          showCaption
        />
      </div>

      <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        {[
          { label: "Champion", value: championship.winnerName },
          { label: "Score", value: formatToPar(championship.scoreToPar) },
          { label: "Margin", value: championship.margin },
          { label: "Venue", value: championship.venueName },
        ].map((stat) => (
          <div key={stat.label} className="flex flex-col gap-1 border border-border p-4">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</dt>
            <dd className="font-display text-lg font-bold">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <Link href={`/venues/${championship.venueSlug}`} className="w-fit text-sm font-medium text-primary hover:underline">
        View {championship.venueName} →
      </Link>
    </Container>
  );
}
