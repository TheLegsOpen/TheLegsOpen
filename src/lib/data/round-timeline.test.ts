import { describe, expect, it } from "vitest";

import { clockLabel, largestLeadOnTheClock } from "./round-timeline";
import type { CompetitionEntry, HoleScore } from "@/lib/data/scorecards";

/** Eighteen par fours, so every hole takes thirteen minutes and the arithmetic stays legible. */
function holes(relatives: (number | "X" | null)[]): HoleScore[] {
  return Array.from({ length: 18 }, (_, i) => {
    const r = relatives[i];
    if (r === "X") return { holeNumber: i + 1, par: 4, value: undefined, relative: 0, noReturn: true };
    if (r === null || r === undefined) return { holeNumber: i + 1, par: 4, value: undefined, relative: 0 };
    return { holeNumber: i + 1, par: 4, value: 4 + r, relative: r };
  });
}

function player(name: string, teeTime: string, relatives: (number | "X" | null)[], extra: Partial<CompetitionEntry> = {}): CompetitionEntry {
  return {
    position: 1,
    tied: false,
    player: { id: name, name, country: "Scotland", countryCode: "gb-sct", previousOpens: 0, bio: null },
    started: true,
    thru: "F",
    teeTime,
    holes: holes(relatives),
    ...extra,
  };
}

const level = Array(18).fill(0);

describe("largestLeadOnTheClock", () => {
  it("measures the gap at a moment, not after the same hole number", () => {
    // Early goes round in level par. Late, half an hour behind, is four over through his first
    // three holes and then levels out. Hole for hole they finish in the same place; on the clock
    // Early is well clear while Late is still on the front nine.
    const early = player("Early", "10.00", level);
    const late = player("Late", "10.30", [2, 1, 1, ...Array(15).fill(0)]);
    const lead = largestLeadOnTheClock([early, late]);
    expect(lead?.holderName).toBe("Early");
    expect(lead?.margin).toBe(4);
  });

  it("lets a lead grow while its holder is doing nothing", () => {
    // Leader finishes early at level par and goes in. The chaser, still out on the course, drops
    // three shots over his closing holes. The biggest gap happens after the leader has stopped
    // playing, which is exactly the case a hole-for-hole count cannot see.
    const leader = player("Leader", "10.00", level);
    const chaser = player("Chaser", "10.40", [...Array(15).fill(0), 1, 1, 1]);
    const lead = largestLeadOnTheClock([leader, chaser]);
    expect(lead?.holderName).toBe("Leader");
    expect(lead?.margin).toBe(3);
    // 10.00 plus eighteen par fours is 13 * 18 = 234 minutes, so the leader was in at 13:54; the
    // chaser's last hole lands later still, which is when the gap peaks.
    expect(lead!.atMinutes).toBeGreaterThan(13 * 60 + 54);
  });

  it("takes a player off the board when they pick up", () => {
    // The chaser is two clear of the field when he picks up at the fourth. From that moment he
    // isn't someone a lead can be measured against, so the leader's margin is judged on whoever
    // is actually still scoring.
    const leader = player("Leader", "10.00", level);
    const quitter = player("Quitter", "10.00", [-2, 0, 0, "X", ...Array(14).fill(null)], { thru: "F", noReturn: true });
    const backmarker = player("Backmarker", "10.00", Array(18).fill(1));
    const lead = largestLeadOnTheClock([leader, quitter, backmarker]);
    expect(lead?.holderName).toBe("Leader");
    // Against the backmarker alone, one shot a hole for eighteen holes.
    expect(lead?.margin).toBe(18);
  });

  it("ignores a withdrawal entirely", () => {
    const leader = player("Leader", "10.00", level);
    const gone = player("Gone", "10.00", [-3, ...Array(17).fill(null)], { withdrawn: true, thru: "1" });
    const other = player("Other", "10.00", Array(18).fill(1));
    expect(largestLeadOnTheClock([leader, gone, other])?.holderName).toBe("Leader");
  });

  it("returns nothing when only one player is ever on the board", () => {
    expect(largestLeadOnTheClock([player("Alone", "10.00", level)])).toBeUndefined();
    expect(largestLeadOnTheClock([])).toBeUndefined();
  });

  it("reports when the board showed it", () => {
    const lead = largestLeadOnTheClock([player("A", "10.00", level), player("B", "10.00", Array(18).fill(1))]);
    expect(clockLabel(lead!.atMinutes)).toMatch(/^\d{2}:\d{2}$/);
    expect(lead?.afterHole).toBe(18);
  });
});

describe("clockLabel", () => {
  it("prints minutes past midnight as a clock time", () => {
    expect(clockLabel(624)).toBe("10:24");
    expect(clockLabel(749)).toBe("12:29");
    expect(clockLabel(0)).toBe("00:00");
  });
});
