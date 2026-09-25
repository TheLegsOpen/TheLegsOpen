import { describe, expect, it, vi, beforeEach } from "vitest";
import type { PayloadRequest } from "payload";

import type { CompetitionEntry } from "@/lib/data/scorecards";
import type { Player } from "@/types/player";

const boards = new Map<string, CompetitionEntry[]>();

vi.mock("@/lib/data/scorecards", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/data/scorecards")>()),
  getCompetitionLeaderboardForChampionshipId: async (id: string) => boards.get(String(id)) ?? [],
}));

const { getLowestWinningScoreRecord } = await import("@/lib/live-blog/championship-records");

function player(id: string, name: string): Player {
  return { id, name, country: "Scotland", countryCode: "gb-sct", previousOpens: 0, bio: null };
}

function entry(p: Player, over: Partial<CompetitionEntry>): CompetitionEntry {
  return { position: 1, tied: false, player: p, started: true, thru: "F", teeTime: "10.00", holes: [], ...over };
}

/** Enough of a req for priorChampionships, which is the only payload call this makes. */
function req(years: { id: string; year: number }[]): PayloadRequest {
  return { payload: { find: async () => ({ docs: years }) } } as unknown as PayloadRequest;
}

beforeEach(() => boards.clear());

describe("getLowestWinningScoreRecord", () => {
  /**
   * 2019 published "Bryan Forbes wins on -1 -- the lowest winning total in championship history",
   * naming 2018's +2 as the previous record. Alastair Campbell had won at -4 in 2013, on
   * countback, which leaves him tied for first on the raw leaderboard -- and the outright-winner
   * filter borrowed from the margin record skipped his year entirely. The margin record is right
   * to skip a tiebreak, which has no stroke margin to compare. This one has a score.
   */
  it("counts a year whose title was decided on countback", async () => {
    const campbell = player("campbell", "Alastair Campbell");
    boards.set("2013", [
      entry(campbell, { toPar: -4, tied: true, holes: [] }),
      entry(player("clee", "David Clee"), { toPar: -4, tied: true }),
      entry(player("pow", "John Pow"), { toPar: 2, position: 3 }),
    ]);
    boards.set("2018", [
      entry(player("burns", "David Burns"), { toPar: 2 }),
      entry(player("magowan", "Stephen Magowan"), { toPar: 4, position: 2 }),
    ]);

    const record = await getLowestWinningScoreRecord(req([
      { id: "2013", year: 2013 },
      { id: "2018", year: 2018 },
    ]), "2019");

    expect(record?.toParNett).toBe(-4);
    expect(record?.year).toBe(2013);
  });

  it("still finds an outright winner", async () => {
    boards.set("2018", [
      entry(player("burns", "David Burns"), { toPar: 2 }),
      entry(player("magowan", "Stephen Magowan"), { toPar: 4, position: 2 }),
    ]);
    const record = await getLowestWinningScoreRecord(req([{ id: "2018", year: 2018 }]), "2019");
    expect(record?.toParNett).toBe(2);
    expect(record?.holderName).toBe("David Burns");
  });

  it("ignores a year nobody finished", async () => {
    boards.set("2020", [entry(player("x", "Someone"), { toPar: 1, thru: "12" })]);
    expect(await getLowestWinningScoreRecord(req([{ id: "2020", year: 2020 }]), "2019")).toBeNull();
  });
});
