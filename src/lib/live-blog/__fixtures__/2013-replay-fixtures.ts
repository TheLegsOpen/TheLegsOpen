import type { Player, Championship, Venue, TeeTimeRound } from "@/payload-types";

/** Carnwath's real 2013 pars/stroke-indexes, fetched from production -- see the note in
 * 2013-replay.test.ts for how this fixture set was built. */
export const VENUE_HOLES: { holeNumber: number; par: number; si: number; yards: number }[] = [
  { holeNumber: 1, par: 3, si: 9, yards: 165 },
  { holeNumber: 2, par: 3, si: 7, yards: 230 },
  { holeNumber: 3, par: 4, si: 13, yards: 315 },
  { holeNumber: 4, par: 3, si: 15, yards: 161 },
  { holeNumber: 5, par: 4, si: 5, yards: 353 },
  { holeNumber: 6, par: 4, si: 1, yards: 380 },
  { holeNumber: 7, par: 5, si: 17, yards: 475 },
  { holeNumber: 8, par: 4, si: 3, yards: 416 },
  { holeNumber: 9, par: 4, si: 11, yards: 359 },
  { holeNumber: 10, par: 3, si: 10, yards: 149 },
  { holeNumber: 11, par: 4, si: 16, yards: 256 },
  { holeNumber: 12, par: 4, si: 8, yards: 302 },
  { holeNumber: 13, par: 4, si: 2, yards: 356 },
  { holeNumber: 14, par: 4, si: 18, yards: 248 },
  { holeNumber: 15, par: 4, si: 14, yards: 296 },
  { holeNumber: 16, par: 4, si: 6, yards: 276 },
  { holeNumber: 17, par: 4, si: 4, yards: 445 },
  { holeNumber: 18, par: 4, si: 12, yards: 450 },
];

const timestamp = "2026-01-01T00:00:00.000Z";

export const VENUE: Venue = {
  id: "v1",
  name: "Carnwath",
  location: "Scotland",
  region: "Scotland",
  timesHosted: 1,
  firstHosted: 2013,
  lastHosted: 2013,
  description: "Carnwath",
  imageLabel: "Carnwath",
  holes: VENUE_HOLES,
  updatedAt: timestamp,
  createdAt: timestamp,
};

interface PlayerSeed {
  id: string;
  name: string;
  handicap: number;
  country: string;
  countryCode: string;
}

/** Real 2013 field and handicaps, read off production's live-blog posts after the full replay. */
export const PLAYER_SEEDS: PlayerSeed[] = [
  { id: "26", name: "John Pow", handicap: 13, country: "Scotland", countryCode: "SCO" },
  { id: "24", name: "Bobby Ferguson", handicap: 16, country: "Scotland", countryCode: "SCO" },
  { id: "27", name: "Toby Stanton", handicap: 22, country: "England", countryCode: "ENG" },
  { id: "28", name: "John Taylor", handicap: 18, country: "Scotland", countryCode: "SCO" },
  { id: "25", name: "David Clee", handicap: 17, country: "Scotland", countryCode: "SCO" },
  { id: "30", name: "Scott Ingram", handicap: 13, country: "Scotland", countryCode: "SCO" },
  { id: "31", name: "Robert Hamilton", handicap: 6, country: "Scotland", countryCode: "SCO" },
  { id: "21", name: "Mark Alston", handicap: 24, country: "Scotland", countryCode: "SCO" },
  { id: "32", name: "David Pow", handicap: 20, country: "Scotland", countryCode: "SCO" },
  { id: "29", name: "Iain MacLeod", handicap: 20, country: "Scotland", countryCode: "SCO" },
  { id: "23", name: "Alastair Campbell", handicap: 10, country: "Scotland", countryCode: "SCO" },
];

export const PLAYERS: Player[] = PLAYER_SEEDS.map((p) => ({
  id: p.id,
  name: p.name,
  country: p.country,
  countryCode: p.countryCode,
  previousOpens: 0,
  championshipHandicap: p.handicap,
  updatedAt: timestamp,
  createdAt: timestamp,
}));

export function findPlayer(id: string): Player {
  const player = PLAYERS.find((p) => p.id === id);
  if (!player) throw new Error(`Unknown fixture player id ${id}`);
  return player;
}

export const CHAMPIONSHIP: Championship = {
  id: "c1",
  year: 2013,
  isActive: true,
  completed: false,
  venue: VENUE,
  updatedAt: timestamp,
  createdAt: timestamp,
};

/** Real tee-off order -- Group 4 (David Pow, Iain MacLeod, Alastair Campbell) really was last out, matching the actual "last group out" post from the live replay. */
export const GROUPS: { time: string; playerIds: string[] }[] = [
  { time: "09.00", playerIds: ["26", "24"] },
  { time: "09.10", playerIds: ["27", "28", "25"] },
  { time: "09.20", playerIds: ["30", "31", "21"] },
  { time: "09.30", playerIds: ["32", "29", "23"] },
];

export const TEE_TIME_ROUND: TeeTimeRound = {
  id: "t1",
  round: "Championship",
  championship: CHAMPIONSHIP,
  date: "2013-08-11",
  groups: GROUPS.map((g) => ({ time: g.time, tee: "1st", players: g.playerIds.map(findPlayer) })),
  updatedAt: timestamp,
  createdAt: timestamp,
};
