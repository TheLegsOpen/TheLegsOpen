import { describe, expect, it } from "vitest";

import { clubMatchesQuery, normaliseForSearch } from "@/lib/uk-golf-api";

// Real records as the API returns them, checked against the live /clubs?country=SCO on 2026-11-04.
const ST_ANDREWS = { name: "St. Andrews", city: "St Andrews", county: "Fife" };
const KINGSBARNS = { name: "Kingsbarns Golf Links", city: "St Andrews", county: "Scotland" };
const DRUMOIG = { name: "Drumoig Golf Club", city: "St Andrews", county: "Scotland" };
const ALYTH = { name: "Alyth Golf Club", city: "Blairgowrie", county: "Perth and Kinross" };

describe("normaliseForSearch", () => {
  it("drops a full stop without leaving a gap, so St. matches St", () => {
    expect(normaliseForSearch("St. Andrews")).toBe("st andrews");
    expect(normaliseForSearch("St Andrews")).toBe("st andrews");
  });

  it("drops apostrophes, including the curly kind a paste brings in", () => {
    expect(normaliseForSearch("Duke's")).toBe("dukes");
    expect(normaliseForSearch("Duke’s")).toBe("dukes");
    expect(normaliseForSearch("Dukes")).toBe("dukes");
  });

  it("turns a hyphen into a space so the name can be typed either way", () => {
    expect(normaliseForSearch("Newton-Stewart")).toBe("newton stewart");
  });

  it("collapses repeated whitespace and trims", () => {
    expect(normaliseForSearch("  Royal   Dornoch  ")).toBe("royal dornoch");
  });
});

describe("clubMatchesQuery", () => {
  it("finds St. Andrews when the full stop is not typed", () => {
    // The bug that started this: a literal substring test returned nothing for the one club
    // anybody would expect to find.
    expect(clubMatchesQuery(ST_ANDREWS, "St Andrews")).toBe(true);
  });

  it("still finds it when the full stop is typed", () => {
    expect(clubMatchesQuery(ST_ANDREWS, "St. Andrews")).toBe(true);
  });

  it("finds a club by the town it is in, not only by its name", () => {
    expect(clubMatchesQuery(KINGSBARNS, "St Andrews")).toBe(true);
    expect(clubMatchesQuery(DRUMOIG, "St Andrews")).toBe(true);
  });

  it("finds a club by county", () => {
    expect(clubMatchesQuery(ALYTH, "Perth and Kinross")).toBe(true);
  });

  it("ignores case", () => {
    expect(clubMatchesQuery(ST_ANDREWS, "ST ANDREWS")).toBe(true);
    expect(clubMatchesQuery(ST_ANDREWS, "st andrews")).toBe(true);
  });

  it("still matches on a partial word", () => {
    expect(clubMatchesQuery(KINGSBARNS, "kingsbar")).toBe(true);
  });

  it("does not match an unrelated club", () => {
    expect(clubMatchesQuery(ALYTH, "St Andrews")).toBe(false);
  });

  it("matches nothing when the query is only punctuation", () => {
    // It normalises to an empty string, which every club's name contains.
    expect(clubMatchesQuery(ST_ANDREWS, "...")).toBe(false);
    expect(clubMatchesQuery(ST_ANDREWS, "   ")).toBe(false);
  });

  it("copes with a club that has no city or county", () => {
    expect(clubMatchesQuery({ name: "Carnwath Golf Club" }, "carnwath")).toBe(true);
    expect(clubMatchesQuery({ name: "Carnwath Golf Club" }, "fife")).toBe(false);
  });

  it("does not find Craigtoun, which is genuinely absent from the API", () => {
    // Recorded so this is not mistaken for a search bug again: St Andrews Links Trust renamed the
    // Duke's Course to Craigtoun in January 2026 and the API carries neither name, nor the Old or
    // New Course. It has to be entered by hand.
    const everyStAndrewsClub = [ST_ANDREWS, KINGSBARNS, DRUMOIG];
    expect(everyStAndrewsClub.some((club) => clubMatchesQuery(club, "craigtoun"))).toBe(false);
    expect(everyStAndrewsClub.some((club) => clubMatchesQuery(club, "dukes"))).toBe(false);
  });
});
