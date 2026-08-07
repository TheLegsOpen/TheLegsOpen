import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { mediaUrl, slugify } from "@/lib/utils";
import { lexicalToPlainParagraphs } from "@/lib/lexical";
import { getChampionshipHistory } from "@/lib/data/championships";
import { getCompetitionLeaderboardForChampionshipId } from "@/lib/data/scorecards";
import type { Player, FieldPlayer } from "@/types/player";
import type { CompetitionEntry } from "@/lib/data/scorecards";
import type { Player as PayloadPlayer } from "@/payload-types";

/**
 * Data-access seam for player profiles — now backed by the Players
 * collection in Payload/Postgres rather than local fixtures.
 */

export function mapPlayer(doc: PayloadPlayer): Player {
  return {
    id: doc.id,
    name: doc.name,
    country: doc.country,
    countryCode: doc.countryCode,
    age: doc.hideAge ? undefined : doc.age ?? undefined,
    championshipHandicap: doc.championshipHandicap ?? undefined,
    previousOpens: doc.previousOpens,
    turnedPro: doc.turnedPro ?? undefined,
    debutYear: doc.debutYear ?? undefined,
    photoUrl: mediaUrl(doc.photo),
    gallery: (doc.gallery ?? []).map((photo) => ({ imageUrl: mediaUrl(photo.image), caption: photo.caption ?? undefined })),
    featuredArticleSlugs: (doc.featuredArticles ?? [])
      .map((article) => (typeof article === "object" ? (article.slug ?? slugify(article.title)) : undefined))
      .filter((slug): slug is string => Boolean(slug)),
    bio: lexicalToPlainParagraphs(doc.bio),
  };
}

export async function getPlayers(): Promise<Player[]> {
  const payload = await getPayload({ config: configPromise });
  const result = await payload.find({ collection: "players", limit: 200, sort: "name" });
  return result.docs.map(mapPlayer);
}

export async function getPlayerBySlug(slug: string): Promise<Player | undefined> {
  const payload = await getPayload({ config: configPromise });
  const result = await payload.find({ collection: "players", where: { slug: { equals: slug } }, limit: 1 });
  return result.docs[0] ? mapPlayer(result.docs[0]) : undefined;
}

function ageInYears(dobIso: string, asOfIso: string): number {
  const dob = new Date(dobIso);
  const asOf = new Date(asOfIso);
  let age = asOf.getFullYear() - dob.getFullYear();
  const monthDiff = asOf.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && asOf.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

/** Players ticked "In Current Field", with age computed as of the active championship's date rather than today — so replaying a past championship shows their age at the time. */
export async function getFieldPlayers(asOfIso: string): Promise<FieldPlayer[]> {
  const payload = await getPayload({ config: configPromise });
  const result = await payload.find({ collection: "players", where: { inField: { equals: true } }, limit: 200, sort: "name" });
  return result.docs.map((doc) => ({
    ...mapPlayer(doc),
    ageAtChampionship: !doc.hideAge && doc.dateOfBirth ? ageInYears(doc.dateOfBirth, asOfIso) : undefined,
  }));
}

export async function getAllPlayerSlugs(): Promise<string[]> {
  const payload = await getPayload({ config: configPromise });
  const result = await payload.find({ collection: "players", limit: 200 });
  return result.docs.map((doc) => doc.slug ?? slugify(doc.name)).filter(Boolean);
}

export interface PlayerPerformance {
  year: number;
  venueName: string;
  /** "Winner" for a confirmed win, or a real computed position (e.g. "T5") — never a guess. */
  finish: string;
  /** Sort/compare key: 1 for a win, the real position otherwise. */
  position: number;
}

function isConcluded(entries: CompetitionEntry[]): boolean {
  const started = entries.filter((e) => e.started);
  return started.length > 0 && started.every((e) => e.thru === "F");
}

/**
 * Real Legs Open history for this player, year by year — never fabricated. A win is always
 * trustworthy (it's the officially confirmed result). Any other finish is only included when
 * that year's real scorecards concluded AND agree with the confirmed winner (the same guard used
 * for Records) — otherwise the year is left out rather than guessed, since a regulation round
 * that doesn't match the confirmed result can't be trusted to say where anyone else finished.
 */
export async function getPlayerPerformances(player: Player): Promise<PlayerPerformance[]> {
  const history = await getChampionshipHistory();
  const played = history.filter((c) => c.winnerName);

  const results = await Promise.all(
    played.map(async (c): Promise<PlayerPerformance | undefined> => {
      if (c.winnerName === player.name) {
        return { year: c.year, venueName: c.venueName, finish: "Winner", position: 1 };
      }

      const main = await getCompetitionLeaderboardForChampionshipId(c.id, "main");
      if (!isConcluded(main)) return undefined;

      const winner = main.find((e) => e.position === 1);
      if (!winner || winner.tied || winner.player.name !== c.winnerName) return undefined;

      const entry = main.find((e) => e.player.name === player.name);
      if (!entry || !entry.started) return undefined;

      return { year: c.year, venueName: c.venueName, finish: entry.tied ? `T${entry.position}` : `${entry.position}`, position: entry.position };
    }),
  );

  return results.filter((r): r is PlayerPerformance => Boolean(r)).sort((a, b) => b.year - a.year);
}
