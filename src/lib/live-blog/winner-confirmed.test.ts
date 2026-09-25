import { describe, expect, it } from "vitest";
import type { PayloadRequest } from "payload";

import { buildWinnerConfirmedCandidates } from "@/lib/live-blog/winner-confirmed";
import { createFakePayload } from "@/lib/live-blog/__fixtures__/fake-payload";
import type { CompetitionEntry, LeaderboardSnapshotPair } from "@/lib/data/scorecards";
import type { Player } from "@/types/player";

function player(id: string, name = id): Player {
  return { id, name, country: "Scotland", countryCode: "gb-sct", previousOpens: 0, bio: [] };
}

function entry(p: Player, over: Partial<CompetitionEntry>): CompetitionEntry {
  return { position: 1, tied: false, player: p, started: true, thru: "F", teeTime: "11.10", holes: [], ...over };
}

const BURNS = player("burns", "David Burns");
const MAGOWAN = player("magowan", "Stephen Magowan");
/** The last group out at Gullane: on the course, no card, and still accruing Stableford points. */
const WASHED_OUT = player("watters", "Colum Watters");

const finishedMain = (thru: string) => [
  entry(BURNS, { toPar: 2, score: 73, thru }),
  entry(MAGOWAN, { toPar: 4, score: 75, thru, position: 2 }),
];

/** Stableford keeps the no-return player in: a pick-up costs that hole, not the round. */
const stableford = (theirThru: string) => [
  entry(BURNS, { score: 34, toPar: 2 }),
  entry(MAGOWAN, { score: 32, toPar: 4, position: 2 }),
  entry(WASHED_OUT, { score: 0, toPar: undefined, thru: theirThru, position: 3 }),
];

function req(): PayloadRequest {
  return { payload: createFakePayload({ championships: [], players: [], venues: [], scorecards: [], "tee-time-rounds": [] }) } as unknown as PayloadRequest;
}

function snapshots(before: Partial<LeaderboardSnapshotPair["before"]>, after: Partial<LeaderboardSnapshotPair["after"]>): LeaderboardSnapshotPair {
  const empty = { main: [], stableford: [], scratch: [] };
  return { before: { ...empty, ...before }, after: { ...empty, ...after } } as LeaderboardSnapshotPair;
}

describe("buildWinnerConfirmedCandidates", () => {
  /**
   * Gullane, 2018. The final group out was four no returns. Main and Scratch disregard them, so
   * both were settled while that group were on their seventeenth; Stableford, which disqualifies
   * nobody, was not settled until they finished ten minutes later. Announcing all three from the
   * save that settled Main meant the Stableford champion was never announced at all.
   */
  it("announces Main while Stableford is still out on the course, then Stableford when it finishes", async () => {
    const mainSettles = snapshots(
      { main: finishedMain("17"), stableford: stableford("16"), scratch: finishedMain("17") },
      { main: finishedMain("F"), stableford: stableford("17"), scratch: finishedMain("F") },
    );

    const first = await buildWinnerConfirmedCandidates(req(), "champ-2018", mainSettles, "save-1");
    const firstWinners = first.filter((c) => c.category === "winner-confirmed").map((c) => c.post.competition);
    expect(firstWinners).toContain("main");
    expect(firstWinners).toContain("scratch");
    expect(firstWinners).not.toContain("stableford");

    const stablefordSettles = snapshots(
      { main: finishedMain("F"), stableford: stableford("17"), scratch: finishedMain("F") },
      { main: finishedMain("F"), stableford: stableford("F"), scratch: finishedMain("F") },
    );

    const second = await buildWinnerConfirmedCandidates(req(), "champ-2018", stablefordSettles, "save-2");
    const secondWinners = second.filter((c) => c.category === "winner-confirmed");
    expect(secondWinners.map((c) => c.post.competition)).toEqual(["stableford"]);
    // Burns tops the points on 34 but has the Main, so the title passes to Magowan on 32.
    expect(secondWinners[0].playerName).toBe("Stephen Magowan");
  });

  it("says nothing on a save where no competition concludes", async () => {
    const midRound = snapshots(
      { main: finishedMain("16"), stableford: stableford("15"), scratch: finishedMain("16") },
      { main: finishedMain("17"), stableford: stableford("16"), scratch: finishedMain("17") },
    );
    expect(await buildWinnerConfirmedCandidates(req(), "champ-2018", midRound, "save-3")).toEqual([]);
  });

  it("says nothing again once everything has already been announced", async () => {
    const allDone = snapshots(
      { main: finishedMain("F"), stableford: stableford("F"), scratch: finishedMain("F") },
      { main: finishedMain("F"), stableford: stableford("F"), scratch: finishedMain("F") },
    );
    expect(await buildWinnerConfirmedCandidates(req(), "champ-2018", allDone, "save-4")).toEqual([]);
  });
});
