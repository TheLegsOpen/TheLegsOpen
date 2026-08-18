import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { getChampionshipHistory } from "@/lib/data/championships";
import { getPlayers } from "@/lib/data/players";
import { getCompetitionLeaderboardForChampionshipId, getAllScorecardParticipation } from "@/lib/data/scorecards";
import { getEligibleStablefordChampion, getPlayoffs } from "@/lib/data/playoffs";
import { playerSlug } from "@/lib/utils";
import type { CompetitionEntry } from "@/lib/data/scorecards";
import type { ChampionshipWinner } from "@/types/championship";
import type { PlayoffResult } from "@/lib/data/playoffs";

/** "Alastair Campbell (-2) beat Bobby Ferguson (E)" -- the deciding tiebreak step's own scores for the winner and the best-placed non-winner, reusing the exact same countback resolution the live leaderboard shows during play. Undefined if the title genuinely ended up shared (every tiebreak step exhausted, still level). */
function formatPlayoffResult(result: PlayoffResult): string | undefined {
  if (!result.winner || result.steps.length === 0) return undefined;
  const decidingStep = result.steps[result.steps.length - 1];
  const winnerContender = decidingStep.contenders.find((c) => c.player.id === result.winner!.id);
  const runnerUpContender = decidingStep.contenders
    .filter((c) => c.player.id !== result.winner!.id)
    .sort((a, b) => (result.competition === "stableford" ? b.value - a.value : a.value - b.value))[0];
  if (!winnerContender || !runnerUpContender) return undefined;
  return `${result.winner.name} (${winnerContender.display}) beat ${runnerUpContender.player.name} (${runnerUpContender.display})`;
}

/** Below this a Venue's totalPar reflects an incomplete hole setup, not a genuine course par — see Championships.scoreToPar admin note. */
const MIN_COMPETITOR_AGE = 14;

export interface ChampionEntry {
  year: number;
  name: string;
  country?: string;
  venueName: string;
  slug?: string;
  /** Main/Scratch: nett/gross total for the round. Stableford: points. */
  score?: number;
  /** Main/Scratch only -- Stableford has no par-relative equivalent. */
  scoreToPar?: number;
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

export interface PlayoffRecordEntry extends YearVenueEntry {
  /** e.g. "Alastair Campbell (-2) beat Bobby Ferguson (E)" -- undefined if the title ended up genuinely shared. */
  result?: string;
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

export interface AgeBreakdown {
  years: number;
  months: number;
  days: number;
  /** Exact age in days — used to break ties between two ages that round to the same years/months/days display. */
  totalDays: number;
}

export interface AgeEntry {
  year: number;
  name: string;
  age: AgeBreakdown;
}

export interface CompetitorAgeEntry {
  name: string;
  slug?: string;
  age: AgeBreakdown;
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
  playoffs: PlayoffRecordEntry[];
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

function isConcluded(entries: CompetitionEntry[]): boolean {
  const started = entries.filter((e) => e.started);
  return started.length > 0 && started.every((e) => e.thru === "F");
}

/** Joint winner/runner-up names, comma-separated, for the rare case a group is still tied. */
function namesFor(entries: CompetitionEntry[], position: number): { names: string; country?: string; playerId?: string } {
  const group = entries.filter((e) => e.position === position);
  return {
    names: group.map((e) => e.player.name).join(", "),
    country: group[0]?.player.country,
    playerId: group.length === 1 ? group[0].player.id : undefined,
  };
}

/** Cumulative to-par after each hole, for every player who completed all 18 — the real basis for front-9/lead records, computed from actual hole-by-hole scorecard data rather than hand-entered. */
function runningTotalsByPlayer(entries: CompetitionEntry[]): Map<string, number[]> {
  const map = new Map<string, number[]>();
  for (const entry of entries) {
    if (entry.thru !== "F") continue;
    let running = 0;
    const cumulative: number[] = [];
    for (const hole of entry.holes) {
      running += hole.relative;
      cumulative.push(running);
    }
    map.set(entry.player.id, cumulative);
  }
  return map;
}

function leadAtHole(cumulativeByPlayer: Map<string, number[]>, holeIndex: number): { leaderId: string; lead: number } | undefined {
  const values = Array.from(cumulativeByPlayer.entries())
    .map(([id, cumulative]) => ({ id, value: cumulative[holeIndex] }))
    .filter((v): v is { id: string; value: number } => v.value !== undefined)
    .sort((a, b) => a.value - b.value);
  if (values.length < 2) return undefined;
  return { leaderId: values[0].id, lead: values[1].value - values[0].value };
}

/** Precise calendar age (years/months/days) as of a given date, plus a totalDays figure for exact tie-breaking between two ages that round to the same number of years. */
function ageAt(dobIso: string, atIso: string): AgeBreakdown {
  const dob = new Date(dobIso);
  const at = new Date(atIso);

  let years = at.getFullYear() - dob.getFullYear();
  let months = at.getMonth() - dob.getMonth();
  let days = at.getDate() - dob.getDate();

  if (days < 0) {
    months -= 1;
    const daysInPrevMonth = new Date(at.getFullYear(), at.getMonth(), 0).getDate();
    days += daysInPrevMonth;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const totalDays = Math.round((at.getTime() - dob.getTime()) / 86_400_000);
  return { years, months, days, totalDays };
}

export function formatAge({ years, months, days }: AgeBreakdown): string {
  return `${years}y ${months}m ${days}d`;
}

/** The manual `championAgeAtWin` fallback only ever stores whole years, so it's approximated to a breakdown for display/sort consistency with the precise DOB-based figure. */
function wholeYearsAge(years: number): AgeBreakdown {
  return { years, months: 0, days: 0, totalDays: years * 365.25 };
}

/** Auto-derived facts for a single concluded championship, computed straight from that year's real scorecards — nothing here is hand-entered. */
export interface AutoFacts {
  stablefordWinnerName?: string;
  stablefordWinnerCountry?: string;
  stablefordWinnerScore?: number;
  scratchWinnerName?: string;
  scratchWinnerCountry?: string;
  scratchWinnerScore?: number;
  scratchWinnerScoreToPar?: number;
  runnerUpName?: string;
  runnerUpScore?: number;
  marginStrokes?: number;
  ledOutrightAfter9: boolean;
  deficitAfter9?: number;
  largestLead?: { holderName: string; margin: number; afterHole: number };
  /** The Main competition's own tiebreak resolution, when it needed one -- reused by the Records "Play-offs" list so it doesn't have to re-derive the same countback a second time. */
  mainPlayoffResult?: PlayoffResult;
}

export async function computeAutoFacts(championship: ChampionshipWinner): Promise<AutoFacts | undefined> {
  const [main, stableford, scratch, playoffResults] = await Promise.all([
    getCompetitionLeaderboardForChampionshipId(championship.id, "main"),
    getCompetitionLeaderboardForChampionshipId(championship.id, "stableford"),
    getCompetitionLeaderboardForChampionshipId(championship.id, "scratch"),
    getPlayoffs(championship.id),
  ]);
  if (!isConcluded(main)) return undefined;

  // Scratch is a separate competition from Main and doesn't depend on which Main player eventually
  // took the title, so its winner/score resolve regardless of a Main-side tie.
  const scratchPlayoff = playoffResults.find((r) => r.competition === "scratch");

  // Stableford excludes the Main champion, whether or not the raw Stableford leaderboard's own top
  // spot happened to involve a tie -- getEligibleStablefordChampion re-derives the winner from raw
  // scores so it's correct in both the tied and outright cases (see its own doc comment).
  const stablefordWinnerEntry = getEligibleStablefordChampion(main, stableford);
  const stablefordWinner = stablefordWinnerEntry
    ? { names: stablefordWinnerEntry.player.name, country: stablefordWinnerEntry.player.country }
    : namesFor(stableford, 1);
  const stablefordWinnerScore = stablefordWinnerEntry?.score ?? stableford.find((e) => e.position === 1)?.score;

  const scratchWinnerEntry = scratchPlayoff?.winner
    ? scratch.find((e) => e.player.id === scratchPlayoff.winner!.id)
    : scratch.find((e) => e.position === 1);
  const scratchWinner = scratchPlayoff?.winner
    ? { names: scratchWinnerEntry?.player.name ?? "", country: scratchWinnerEntry?.player.country }
    : namesFor(scratch, 1);

  const cumulative = runningTotalsByPlayer(main);

  // Largest lead by any player at any point doesn't depend on who eventually won either.
  let largestLead: AutoFacts["largestLead"];
  for (let hole = 0; hole < 18; hole++) {
    const lead = leadAtHole(cumulative, hole);
    if (lead && (!largestLead || lead.lead > largestLead.margin)) {
      const holder = main.find((e) => e.player.id === lead.leaderId);
      if (holder) largestLead = { holderName: holder.player.name, margin: lead.lead, afterHole: hole + 1 };
    }
  }

  const winner = main.find((e) => e.position === 1);
  // Runner-up/margin genuinely need the raw scorecards to independently agree on who's 1st and
  // 2nd -- when the top of the board is tied (a real playoff would need extra holes this data
  // model doesn't have), guessing which tied player is "the runner-up" risks misattributing a
  // real result. So those two stay gated on the raw data confirming the officially recorded
  // winner, falling back to the manual fields for that year instead.
  const mainWinnerConfirmed = Boolean(winner && !winner.tied && winner.player.name === championship.winnerName);

  let runnerUp: ReturnType<typeof namesFor> = { names: "" };
  let runnerUpScratch: CompetitionEntry | undefined;
  let marginStrokes: number | undefined;

  if (mainWinnerConfirmed && winner) {
    runnerUp = namesFor(main, 2);
    runnerUpScratch = runnerUp.playerId ? scratch.find((e) => e.player.id === runnerUp.playerId) : undefined;
    const runnerUpToPar = main.find((e) => e.position === 2)?.toPar;
    marginStrokes = winner.toPar !== undefined && runnerUpToPar !== undefined ? runnerUpToPar - winner.toPar : undefined;
  }

  // Front-9 lead/comeback, by contrast, doesn't need the raw data to resolve who's 1st -- it just
  // needs to know who the confirmed champion IS (championship.winnerName, already resolved via
  // playoff where needed) and look up their own hole-9 cumulative, regardless of whether their
  // final 18-hole position was tied. This is what was wrongly gated behind mainWinnerConfirmed
  // before, blanking every playoff year's front-9 story (and the Records "Greatest Comeback" list)
  // even though the champion is known with certainty.
  let ledOutrightAfter9 = false;
  let deficitAfter9: number | undefined;
  const championEntry = main.find((e) => e.player.name === championship.winnerName);
  if (championEntry) {
    const after9 = leadAtHole(cumulative, 8);
    const championId = championEntry.player.id;
    const championCumulative = cumulative.get(championId);
    if (after9 && championCumulative) {
      if (after9.leaderId === championId) {
        ledOutrightAfter9 = true;
      } else {
        const leaderAt9 = championCumulative[8] - after9.lead;
        deficitAfter9 = championCumulative[8] - leaderAt9;
      }
    }
  }

  return {
    stablefordWinnerName: stablefordWinner.names || undefined,
    stablefordWinnerCountry: stablefordWinner.country,
    stablefordWinnerScore,
    scratchWinnerName: scratchWinner.names || undefined,
    scratchWinnerCountry: scratchWinner.country,
    scratchWinnerScore: scratchWinnerEntry?.score,
    scratchWinnerScoreToPar: scratchWinnerEntry?.toPar,
    runnerUpName: runnerUp.names || undefined,
    runnerUpScore: runnerUpScratch?.score,
    marginStrokes,
    ledOutrightAfter9,
    deficitAfter9,
    largestLead,
    mainPlayoffResult: playoffResults.find((r) => r.competition === "main"),
  };
}

export async function getRecords(): Promise<RecordsData> {
  const [history, players, participation] = await Promise.all([
    getChampionshipHistory(),
    getPlayers(),
    getAllScorecardParticipation(),
  ]);

  const payload = await getPayload({ config: configPromise });
  const playerDocs = await payload.find({ collection: "players", limit: 500, depth: 0 });
  const dobById = new Map(playerDocs.docs.map((p) => [String(p.id), p.dateOfBirth ?? undefined]));

  const played: (ChampionshipWinner & { winnerName: string })[] = history.filter(
    (c): c is ChampionshipWinner & { winnerName: string } => Boolean(c.winnerName),
  );

  const autoFactsByYear = new Map<number, AutoFacts>();
  await Promise.all(
    played.map(async (c) => {
      const facts = await computeAutoFacts(c);
      if (facts) autoFactsByYear.set(c.year, facts);
    }),
  );

  const championsMain: ChampionEntry[] = played.map((c) => ({
    year: c.year,
    name: c.winnerName,
    country: c.winnerCountry,
    venueName: c.venueName,
    slug: c.winnerPlayerSlug,
    score: c.winningScore,
    scoreToPar: c.scoreToPar,
  }));

  const championsStableford: ChampionEntry[] = played
    .map((c): ChampionEntry | undefined => {
      const auto = autoFactsByYear.get(c.year);
      const name = auto?.stablefordWinnerName ?? c.stablefordWinnerName;
      const country = auto?.stablefordWinnerCountry ?? c.stablefordWinnerCountry;
      return name ? { year: c.year, name, country, venueName: c.venueName, score: auto?.stablefordWinnerScore } : undefined;
    })
    .filter((c): c is ChampionEntry => Boolean(c));

  const championsScratch: ChampionEntry[] = played
    .map((c): ChampionEntry | undefined => {
      const auto = autoFactsByYear.get(c.year);
      const name = auto?.scratchWinnerName ?? c.scratchWinnerName;
      const country = auto?.scratchWinnerCountry ?? c.scratchWinnerCountry;
      return name
        ? { year: c.year, name, country, venueName: c.venueName, score: auto?.scratchWinnerScore, scoreToPar: auto?.scratchWinnerScoreToPar }
        : undefined;
    })
    .filter((c): c is ChampionEntry => Boolean(c));

  const mostVictoriesMain = victoryCounts(championsMain);
  const mostVictoriesStableford = victoryCounts(championsStableford);
  const mostVictoriesScratch = victoryCounts(championsScratch);

  const largestMargin: MarginEntry[] = played
    .map((c) => {
      const auto = autoFactsByYear.get(c.year);
      const margin = auto ? auto.marginStrokes : Number(c.margin);
      return { year: c.year, name: c.winnerName, venueName: c.venueName, margin };
    })
    .filter((entry): entry is MarginEntry => Number.isFinite(entry.margin))
    .sort((a, b) => b.margin - a.margin)
    .slice(0, 5);

  // c.margin is set to "Playoff" (by computeChampionshipAutoStats, tie-aware via the real
  // playoffs resolution) whenever the Main competition needed a tiebreak -- checking it directly
  // works for every year regardless of whether computeAutoFacts also has an entry for it (that
  // function returns partial facts even for a tied/playoff year now, so "has auto facts" is no
  // longer a reliable proxy for "wasn't a playoff").
  const playoffs: PlayoffRecordEntry[] = played
    .filter((c) => c.margin?.toLowerCase() === "playoff")
    .map((c) => {
      const result = autoFactsByYear.get(c.year)?.mainPlayoffResult;
      return { year: c.year, name: c.winnerName, venueName: c.venueName, result: result ? formatPlayoffResult(result) : undefined };
    });

  const yearById = new Map(played.map((c) => [c.id, c.year]));

  function appearancesBefore(playerId: string, year: number, previousOpensBase: number): number {
    const priorDigitalYears = new Set(
      participation
        .filter((p) => p.playerId === playerId && p.started && (yearById.get(p.championshipId) ?? Infinity) < year)
        .map((p) => p.championshipId),
    );
    return previousOpensBase + priorDigitalYears.size;
  }

  const playersById = new Map(players.map((p) => [String(p.id), p]));

  // Auto-derived the same way as mostAppearancesBeforeFirstVictory below: previousOpens (the
  // hand-maintained pre-digital baseline) plus real digital-era appearances before this year.
  // Falls back to the manual wonOnDebut checkbox only when the winner isn't digitally tracked at
  // all (no winnerPlayerId to look up), since there's nothing to compute in that case.
  const wonOnDebut: YearVenueEntry[] = played
    .filter((c) => {
      if (c.winnerPlayerId) {
        const base = playersById.get(c.winnerPlayerId)?.previousOpens ?? 0;
        return appearancesBefore(c.winnerPlayerId, c.year, base) === 0;
      }
      return Boolean(c.wonOnDebut);
    })
    .map((c) => ({ year: c.year, name: c.winnerName, venueName: c.venueName }));

  const mostAppearancesBeforeFirstVictory = played
    .map((c) => {
      if (c.winnerPlayerId) {
        const base = playersById.get(c.winnerPlayerId)?.previousOpens ?? 0;
        return { year: c.year, name: c.winnerName, appearances: appearancesBefore(c.winnerPlayerId, c.year, base) };
      }
      return c.priorAppearances !== undefined ? { year: c.year, name: c.winnerName, appearances: c.priorAppearances } : undefined;
    })
    .filter((e): e is { year: number; name: string; appearances: number } => Boolean(e) && e!.appearances > 0)
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
    .filter((c) => autoFactsByYear.get(c.year)?.ledOutrightAfter9 ?? c.ledOutrightAfter9)
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
    .map((c) => {
      const auto = autoFactsByYear.get(c.year);
      const deficit = auto ? auto.deficitAfter9 : c.deficitAfter9;
      return deficit !== undefined && deficit > 0 ? { year: c.year, name: c.winnerName, venueName: c.venueName, deficit } : undefined;
    })
    .filter((e): e is ComebackEntry => Boolean(e))
    .sort((a, b) => b.deficit - a.deficit)
    .slice(0, 5);

  const largestLeadByAnyPlayer: LargestLeadEntry[] = played
    .map((c) => {
      const auto = autoFactsByYear.get(c.year)?.largestLead;
      if (auto) return { year: c.year, name: auto.holderName, venueName: c.venueName, margin: auto.margin, afterHole: auto.afterHole };
      if (c.largestLeadHolderName && c.largestLeadMargin !== undefined) {
        return { year: c.year, name: c.largestLeadHolderName, venueName: c.venueName, margin: c.largestLeadMargin, afterHole: c.largestLeadAfterHole ?? 0 };
      }
      return undefined;
    })
    .filter((e): e is LargestLeadEntry => Boolean(e))
    .sort((a, b) => b.margin - a.margin)
    .slice(0, 5);

  const mostAppearances: AppearanceLeader[] = players
    .map((p) => {
      const digitalYears = new Set(
        participation.filter((part) => part.playerId === String(p.id) && part.started).map((part) => part.championshipId),
      );
      return { name: p.name, slug: playerSlug(p), countryCode: p.countryCode, appearances: p.previousOpens + digitalYears.size };
    })
    .filter((p) => p.appearances > 0)
    .sort((a, b) => b.appearances - a.appearances)
    .slice(0, 5);

  const lowestRunnerUpTotal: ScoreEntry[] = played
    .map((c) => {
      const auto = autoFactsByYear.get(c.year);
      const name = auto?.runnerUpName ?? c.runnerUpName;
      const value = auto?.runnerUpScore ?? c.runnerUpScore;
      return name && value !== undefined ? { year: c.year, name, venueName: c.venueName, value } : undefined;
    })
    .filter((e): e is ScoreEntry => Boolean(e))
    .sort((a, b) => a.value - b.value)
    .slice(0, 5);

  const agesAtWin = played
    .map((c) => {
      if (c.winnerPlayerId && c.winnerPlayerDateOfBirth && c.date) {
        return { year: c.year, name: c.winnerName, age: ageAt(c.winnerPlayerDateOfBirth, c.date) };
      }
      return c.championAgeAtWin !== undefined ? { year: c.year, name: c.winnerName, age: wholeYearsAge(c.championAgeAtWin) } : undefined;
    })
    .filter((e): e is AgeEntry => Boolean(e));
  const oldestChampion = [...agesAtWin].sort((a, b) => b.age.totalDays - a.age.totalDays).slice(0, 1);
  const youngestChampion = [...agesAtWin].sort((a, b) => a.age.totalDays - b.age.totalDays).slice(0, 1);

  // "Competitor" means being in that year's field at all — unlike appearance-count records
  // (which track actual rounds played), a competitor's age is fixed the moment they're entered,
  // so there's no reason to wait for them to post a score before counting it.
  const competitorAgeSeen = new Set<string>();
  const competitorAges: CompetitorAgeEntry[] = [];
  for (const p of participation) {
    const key = `${p.championshipId}:${p.playerId}`;
    if (competitorAgeSeen.has(key)) continue;
    competitorAgeSeen.add(key);
    const year = yearById.get(p.championshipId);
    const championship = played.find((c) => c.year === year);
    const dob = dobById.get(p.playerId);
    if (!championship?.date || !dob) continue;
    const age = ageAt(dob, championship.date);
    if (age.years < MIN_COMPETITOR_AGE) continue;
    const player = playersById.get(p.playerId);
    competitorAges.push({ name: player?.name ?? "Unknown", slug: player ? playerSlug(player) : undefined, age });
  }
  const oldestCompetitor = [...competitorAges].sort((a, b) => b.age.totalDays - a.age.totalDays).slice(0, 1);
  const youngestCompetitor = [...competitorAges].sort((a, b) => a.age.totalDays - b.age.totalDays).slice(0, 1);

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
