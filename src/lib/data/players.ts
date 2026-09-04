import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { mediaUrl, slugify } from "@/lib/utils";
import { isConcluded } from "@/lib/leaderboard";
import { getChampionshipHistory, getActiveChampionshipSummary } from "@/lib/data/championships";
import { getCompetitionLeaderboardForChampionshipId, type Competition, type HoleScore } from "@/lib/data/scorecards";
import { getPlayoffs, applyPlayoffToEntries } from "@/lib/data/playoffs";
import type { Player, PlayerWithChampionshipAge } from "@/types/player";
import type { CompetitionEntry } from "@/lib/data/scorecards";
import type { ChampionshipWinner } from "@/types/championship";
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

export interface PlayerCompetitionResult {
  position: number;
  tied: boolean;
  score?: number;
  /** undefined for stableford (points, not to-par) */
  toPar?: number;
  noReturn?: boolean;
  /** Present only when hasScorecards is true on the parent PlayerYearResult. */
  holes?: HoleScore[];
}

export interface PlayerYearResult {
  year: number;
  championshipId: string;
  date?: string;
  venueName: string;
  venueSlug: string;
  /** "Winner" for a confirmed win, or a real computed position (e.g. "T5") — never a guess. */
  finish: string;
  /** Sort/compare key: 1 for a win, the real position otherwise. */
  position: number;
  /** True once real per-hole scorecard data (all three competitions) is available and trustworthy. */
  hasScorecards: boolean;
  main: PlayerCompetitionResult;
  stableford?: PlayerCompetitionResult;
  scratch?: PlayerCompetitionResult;
}

function toResult(entry: CompetitionEntry): PlayerCompetitionResult {
  return { position: entry.position, tied: entry.tied, score: entry.score, toPar: entry.toPar, noReturn: entry.noReturn, holes: entry.holes };
}

function winnerFallback(c: ChampionshipWinner): PlayerYearResult {
  // A confirmed win (the officially recorded winnerName) is always trustworthy, even when that
  // year's per-hole scorecards were never digitized -- rather than drop it, show what the
  // Championship record itself already confirms (its own hand-entered winningScore/scoreToPar),
  // just without a scorecard to expand.
  return {
    year: c.year,
    championshipId: c.id,
    date: c.date,
    venueName: c.venueName,
    venueSlug: c.venueSlug,
    finish: "Winner",
    position: 1,
    hasScorecards: false,
    main: { position: 1, tied: false, score: c.winningScore, toPar: c.scoreToPar },
  };
}

/**
 * Real Legs Open history for this player, year by year — never fabricated. A win is always
 * trustworthy (it's the officially confirmed result). Any other finish is only included when
 * that year's real scorecards concluded AND agree with the confirmed winner (the same guard used
 * for Records) — otherwise the year is left out rather than guessed, since a regulation round
 * that doesn't match the confirmed result can't be trusted to say where anyone else finished.
 *
 * Ties are resolved via the site's real playoff/countback machinery (lib/data/playoffs.ts) rather
 * than a bespoke special case, so Stableford and Scratch ties get the same treatment as Main: the
 * confirmed winner just needs to be one of the players sharing the top spot before resolution, not
 * necessarily the sole outright leader.
 */
export async function getPlayerResults(player: Player): Promise<PlayerYearResult[]> {
  const history = await getChampionshipHistory();
  const played = history.filter((c) => c.winnerName);

  const results = await Promise.all(
    played.map(async (c): Promise<PlayerYearResult | undefined> => {
      const [mainRaw, stablefordRaw, scratchRaw, playoffs] = await Promise.all([
        getCompetitionLeaderboardForChampionshipId(c.id, "main"),
        getCompetitionLeaderboardForChampionshipId(c.id, "stableford"),
        getCompetitionLeaderboardForChampionshipId(c.id, "scratch"),
        getPlayoffs(c.id),
      ]);

      if (!isConcluded(mainRaw)) {
        return c.winnerName === player.name ? winnerFallback(c) : undefined;
      }

      const byCompetition: Record<Competition, CompetitionEntry[]> = {
        main: applyPlayoffToEntries(mainRaw, playoffs.find((p) => p.competition === "main")),
        stableford: applyPlayoffToEntries(stablefordRaw, playoffs.find((p) => p.competition === "stableford")),
        scratch: applyPlayoffToEntries(scratchRaw, playoffs.find((p) => p.competition === "scratch")),
      };

      const confirmedWinner = byCompetition.main.some((e) => e.position === 1 && e.player.name === c.winnerName);
      if (!confirmedWinner) return c.winnerName === player.name ? winnerFallback(c) : undefined;

      const mainEntry = byCompetition.main.find((e) => e.player.name === player.name);
      if (!mainEntry || !mainEntry.started) return undefined;

      const finish = mainEntry.position === 1 ? "Winner" : mainEntry.tied ? `T${mainEntry.position}` : `${mainEntry.position}`;
      const stablefordEntry = byCompetition.stableford.find((e) => e.player.name === player.name);
      const scratchEntry = byCompetition.scratch.find((e) => e.player.name === player.name);

      return {
        year: c.year,
        championshipId: c.id,
        date: c.date,
        venueName: c.venueName,
        venueSlug: c.venueSlug,
        finish,
        position: mainEntry.position,
        hasScorecards: true,
        main: toResult(mainEntry),
        stableford: stablefordEntry && toResult(stablefordEntry),
        scratch: scratchEntry && toResult(scratchEntry),
      };
    }),
  );

  return results.filter((r): r is PlayerYearResult => Boolean(r)).sort((a, b) => b.year - a.year);
}
