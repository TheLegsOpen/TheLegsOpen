import type { Metadata } from "next";

import { PageHero } from "@/components/shared/page-hero";
import { Container } from "@/components/shared/container";
import { PlayerCard } from "@/components/field/player-card";
import { getPlayers } from "@/lib/data/players";

export const metadata: Metadata = {
  title: "Field",
  description: "The full field of players competing at The Legs Open.",
};

export default async function FieldPage() {
  const players = await getPlayers();
  const sorted = [...players].sort((a, b) => {
    const aSurname = a.name.split(" ").slice(-1)[0];
    const bSurname = b.name.split(" ").slice(-1)[0];
    return aSurname.localeCompare(bSurname);
  });

  return (
    <>
      <PageHero
        eyebrow="Championship Week"
        title="The Field"
        description={`${sorted.length} players competing at Seabrook Old Course this week.`}
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Field" }]}
      />
      <Container className="py-16 sm:py-24">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
          {sorted.map((player) => (
            <PlayerCard key={player.id} player={player} />
          ))}
        </div>
      </Container>
    </>
  );
}
