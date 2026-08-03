import { getChampionshipHistory } from "@/lib/data/championships";
import { getPlayers } from "@/lib/data/players";
import { playerSlug } from "@/lib/utils";
import type { ChampionshipWinner } from "@/types/championship";

/** Below this a Venue's totalPar reflects an incomplete hole setup, not a genuine course par — see Championships.scoreToPar admin note. */
const MIN_COMPETITOR_AGE = 14;

export interface ChampionEntry {
  year: number;
  name: string;
  country?: string;
  venueName: string;
  slug?: string;
}

export interface VictoryCount {
  name: string;
  country?: string;
  count: number;
  years: number[];
}

export interface MarginEntry {
  year: number;
  name: string;
  venueName: string;
  margin: number;
}

export interface YearVenueEntry {
  year: number;
  name: string;
  venueName: string;
}

export interface ScoreEntry {
  year: number;
  name: string;
  venueName: string;
  value: number;
}

export interface ComebackEntry {
  year: number;
  name: string;
  venueName: string;
  deficit: number;
}

export interface LargestLeadEntry {
  year: number;
  name: string;
  venueName: string;
  margin: number;
  afterHole: number;
}

export interface DecadeSpanEntry {
  name: string;
  decades: number[];
  years: number[];
}

export interface AppearanceLeader {
  name: string;
  slug?: string;
  countryCode: string;
  appearances: number;
}

export interface AgeEntry {
  year: number;
  name: string;
  age: number;
}

export interface CompetitorAgeEntry {
  name: string;
  slug?: string;
  age: number;
}

export interface CourseHostCount {
  venueName: string;
  count: number;
  years: number[];
}

export interface InternationalWinnerEntry {
  year: number;
  name: string;
  country: string;
}

export interface RecordsData {
  championsMain: ChampionEntry[];
  championsStableford: ChampionEntry[];
  championsScratch: ChampionEntry[];
  mostVictoriesMain: VictoryCount[];
  mostVictoriesStableford: VictoryCount[];
  mostVictoriesScratch: VictoryCount[];
  largestMargin: MarginEntry[];
  playoffs: YearVenueEntry[];
  wonOnDebut: YearVenueEntry[];
  mostAppearancesBeforeFirstVictory: { year: number; name: string; appearances: number }[];
  threeDecadeChampions: DecadeSpanEntry[];
  ledOutrightAfter9: YearVenueEntry[];
  lowestScoreInRound: ScoreEntry[];
  lowestWinningToPar: ScoreEntry[];
  greatestComebackAfter9: ComebackEntry[];
  largestLeadByAnyPlayer: LargestLeadEntry[];
  mostAppearances: AppearanceLeader[];
  lowestRunnerUpTotal: ScoreEntry[];
  oldestChampion: AgeEntry[];
  youngestChampion: AgeEntry[];
  oldestCompetitor: CompetitorAgeEntry[];
  youngestCompetitor: CompetitorAgeEntry[];
  courseHostCounts: CourseHostCount[];
  internationalWinners: InternationalWinnerEntry[];
}

function victoryCounts(entries: { name: string; country?: string; year: number }[]): VictoryCount[] {
  const byName = new Map<string, VictoryCount>();
  for (const entry of entries) {
    const existing = byName.get(entry.name);
    if (existing) {
      existing.count += 1;
      existing.years.push(entry.year);
    } else {
      byName.set(entry.name, { name: entry.name, country: entry.country, count: 1, years: [entry.year] });
    }
  }
  return Array.from(byName.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export async function getRecords(): Promise<RecordsData> {
  const history = await getChampionshipHistory();
  const players = await getPlayers();

  const played: (ChampionshipWinner & { winnerName: string })[] = history.filter(
    (c): c is ChampionshipWinner & { winnerName: string } => Boolean(c.winnerName),
  );

  const championsMain: ChampionEntry[] = played.map((c) => ({
    year: c.year,
    name: c.winnerName,
    country: c.winnerCountry,
    venueName: c.venueName,
    slug: c.winnerPlayerSlug,
  }));

  const championsStableford: ChampionEntry[] = played
    .filter((c) => c.stablefordWinnerName)
    .map((c) => ({ year: c.year, name: c.stablefordWinnerName!, country: c.stablefordWinnerCountry, venueName: c.venueName }));

  const championsScratch: ChampionEntry[] = played
    .filter((c) => c.scratchWinnerName)
    .map((c) => ({ year: c.year, name: c.scratchWinnerName!, country: c.scratchWinnerCountry, venueName: c.venueName }));

  const mostVictoriesMain = victoryCounts(championsMain);
  const mostVictoriesStableford = victoryCounts(championsStableford);
  const mostVictoriesScratch = victoryCounts(championsScratch);

  const largestMargin: MarginEntry[] = played
    .map((c) => ({ year: c.year, name: c.winnerName, venueName: c.venueName, margin: Number(c.margin) }))
    .filter((entry): entry is MarginEntry => Number.isFinite(entry.margin))
    .sort((a, b) => b.margin - a.margin)
    .slice(0, 5);

  const playoffs: YearVenueEntry[] = played
    .filter((c) => c.margin?.toLowerCase() === "playoff")
    .map((c) => ({ year: c.year, name: c.winnerName, venueName: c.venueName }));

  const wonOnDebut: YearVenueEntry[] = played
    .filter((c) => c.wonOnDebut)
    .map((c) => ({ year: c.year, name: c.winnerName, venueName: c.venueName }));

  const mostAppearancesBeforeFirstVictory = played
    .filter((c) => c.priorAppearances !== undefined)
    .map((c) => ({ year: c.year, name: c.winnerName, appearances: c.priorAppearances! }))
    .sort((a, b) => b.appearances - a.appearances)
    .slice(0, 5);

  const decadesByName = new Map<string, { years: number[]; decades: Set<number> }>();
  for (const c of championsMain) {
    const decade = Math.floor(c.year / 10) * 10;
    const existing = decadesByName.get(c.name);
    if (existing) {
      existing.years.push(c.year);
      existing.decades.add(decade);
    } else {
      decadesByName.set(c.name, { years: [c.year], decades: new Set([decade]) });
    }
  }
  const threeDecadeChampions: DecadeSpanEntry[] = Array.from(decadesByName.entries())
    .filter(([, v]) => v.decades.size >= 3)
    .map(([name, v]) => ({ name, decades: Array.from(v.decades).sort(), years: v.years.sort((a, b) => a - b) }));

  const ledOutrightAfter9: YearVenueEntry[] = played
    .filter((c) => c.ledOutrightAfter9)
    .map((c) => ({ year: c.year, name: c.winnerName, venueName: c.venueName }));

  const lowestScoreInRound: ScoreEntry[] = played
    .filter((c) => c.winningScore !== undefined)
    .map((c) => ({ year: c.year, name: c.winnerName, venueName: c.venueName, value: c.winningScore! }))
    .sort((a, b) => a.value - b.value)
    .slice(0, 5);

  const lowestWinningToPar: ScoreEntry[] = played
    .filter((c) => c.scoreToPar !== undefined)
    .map((c) => ({ year: c.year, name: c.winnerName, venueName: c.venueName, value: c.scoreToPar! }))
    .sort((a, b) => a.value - b.value)
    .slice(0, 5);

  const greatestComebackAfter9: ComebackEntry[] = played
    .filter((c) => c.deficitAfter9 !== undefined && c.deficitAfter9 > 0)
    .map((c) => ({ year: c.year, name: c.winnerName, venueName: c.venueName, deficit: c.deficitAfter9! }))
    .sort((a, b) => b.deficit - a.deficit)
    .slice(0, 5);

  const largestLeadByAnyPlayer: LargestLeadEntry[] = played
    .filter((c) => c.largestLeadHolderName && c.largestLeadMargin !== undefined)
    .map((c) => ({
      year: c.year,
      name: c.largestLeadHolderName!,
      venueName: c.venueName,
      margin: c.largestLeadMargin!,
      afterHole: c.largestLeadAfterHole ?? 0,
    }))
    .sort((a, b) => b.margin - a.margin)
    .slice(0, 5);

  const mostAppearances: AppearanceLeader[] = players
    .filter((p) => p.previousOpens > 0)
    .map((p) => ({ name: p.name, slug: playerSlug(p), countryCode: p.countryCode, appearances: p.previousOpens }))
    .sort((a, b) => b.appearances - a.appearances)
    .slice(0, 5);

  const lowestRunnerUpTotal: ScoreEntry[] = played
    .filter((c) => c.runnerUpName && c.runnerUpScore !== undefined)
    .map((c) => ({ year: c.year, name: c.runnerUpName!, venueName: c.venueName, value: c.runnerUpScore! }))
    .sort((a, b) => a.value - b.value)
    .slice(0, 5);

  const agesAtWin = played
    .filter((c) => c.championAgeAtWin !== undefined)
    .map((c) => ({ year: c.year, name: c.winnerName, age: c.championAgeAtWin! }));
  const oldestChampion = [...agesAtWin].sort((a, b) => b.age - a.age).slice(0, 5);
  const youngestChampion = [...agesAtWin].sort((a, b) => a.age - b.age).slice(0, 5);

  const validAges = players
    .filter((p) => p.age !== undefined && p.age >= MIN_COMPETITOR_AGE)
    .map((p) => ({ name: p.name, slug: playerSlug(p), age: p.age! }));
  const oldestCompetitor = [...validAges].sort((a, b) => b.age - a.age).slice(0, 5);
  const youngestCompetitor = [...validAges].sort((a, b) => a.age - b.age).slice(0, 5);

  const hostCounts = new Map<string, CourseHostCount>();
  for (const c of championsMain) {
    const existing = hostCounts.get(c.venueName);
    if (existing) {
      existing.count += 1;
      existing.years.push(c.year);
    } else {
      hostCounts.set(c.venueName, { venueName: c.venueName, count: 1, years: [c.year] });
    }
  }
  const courseHostCounts = Array.from(hostCounts.values()).sort((a, b) => b.count - a.count || a.venueName.localeCompare(b.venueName));

  const internationalWinners: InternationalWinnerEntry[] = played
    .filter((c) => c.winnerCountry && c.winnerCountry.trim().toLowerCase() !== "scotland")
    .map((c) => ({ year: c.year, name: c.winnerName, country: c.winnerCountry! }));

  return {
    championsMain,
    championsStableford,
    championsScratch,
    mostVictoriesMain,
    mostVictoriesStableford,
    mostVictoriesScratch,
    largestMargin,
    playoffs,
    wonOnDebut,
    mostAppearancesBeforeFirstVictory,
    threeDecadeChampions,
    ledOutrightAfter9,
    lowestScoreInRound,
    lowestWinningToPar,
    greatestComebackAfter9,
    largestLeadByAnyPlayer,
    mostAppearances,
    lowestRunnerUpTotal,
    oldestChampion,
    youngestChampion,
    oldestCompetitor,
    youngestCompetitor,
    courseHostCounts,
    internationalWinners,
  };
}
