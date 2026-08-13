import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { mediaUrl, slugify } from "@/lib/utils";
import { getChampionshipHistory, getActiveChampionshipSummary } from "@/lib/data/championships";
import { getCompetitionLeaderboardForChampionshipId } from "@/lib/data/scorecards";
import type { Player, PlayerWithChampionshipAge } from "@/types/player";
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
    bio: doc.bio,
  };
}

export async function getPlayers(): Promise<Player[]> {
  const payload = await getPayload({ config: configPromise });
  const result = await payload.find({ collection: "players", limit: 200, sort: "name" });
  return result.docs.map(mapPlayer);
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

/** Age shown on the player's own profile card is as of the active championship's date, not today — so replaying a past championship shows their age at the time, not their real-world current age. */
export async function getPlayerBySlug(slug: string): Promise<PlayerWithChampionshipAge | undefined> {
  const payload = await getPayload({ config: configPromise });
  const result = await payload.find({ collection: "players", where: { slug: { equals: slug } }, limit: 1 });
  const doc = result.docs[0];
  if (!doc) return undefined;

  const activeChampionship = await getActiveChampionshipSummary();
  const ageAtChampionship =
    !doc.hideAge && doc.dateOfBirth && activeChampionship ? ageInYears(doc.dateOfBirth, activeChampionship.effectiveDate) : undefined;

  return { ...mapPlayer(doc), ageAtChampionship };
}

/** Players ticked "In Current Field" — the public roster shown on the Field page. */
export async function getFieldPlayers(): Promise<Player[]> {
  const payload = await getPayload({ config: configPromise });
  const result = await payload.find({ collection: "players", where: { inField: { equals: true } }, limit: 200, sort: "name" });
  return result.docs.map(mapPlayer);
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
 *
 * The confirmed winner just needs to be one of the players sharing the top spot, not necessarily
 * the sole outright leader -- a title decided by playoff/countback still leaves the raw Main
 * leaderboard showing a tie at 1st (the tiebreak is resolved separately, see lib/data/playoffs.ts),
 * and that tie shouldn't make every other player's real, concluded finish untrustworthy. A player
 * who was themselves part of that tied group but isn't the confirmed winner is the tiebreak's
 * runner-up, so their own finish reads as a clean 2nd rather than "tied 1st".
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

      const topGroup = main.filter((e) => e.position === 1);
      const confirmedWinner = topGroup.find((e) => e.player.name === c.winnerName);
      if (!confirmedWinner) return undefined;

      const entry = main.find((e) => e.player.name === player.name);
      if (!entry || !entry.started) return undefined;

      const wasTiebreakRunnerUp = entry.position === 1 && entry.tied && entry.player.name !== c.winnerName;
      const position = wasTiebreakRunnerUp ? 2 : entry.position;
      const finish = wasTiebreakRunnerUp ? "2" : entry.tied ? `T${entry.position}` : `${entry.position}`;

      return { year: c.year, venueName: c.venueName, finish, position };
    }),
  );

  return results.filter((r): r is PlayerPerformance => Boolean(r)).sort((a, b) => b.year - a.year);
}
