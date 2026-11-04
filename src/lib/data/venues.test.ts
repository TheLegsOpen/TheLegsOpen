import { describe, expect, it } from "vitest";

import { mapVenue } from "@/lib/data/venues";
import type { Venue as PayloadVenue } from "@/payload-types";

// Only the fields mapVenue reads. The collection has a great many more, and spelling them all out
// per test would bury the one thing each case is about.
function doc(over: Partial<PayloadVenue> = {}): PayloadVenue {
  return {
    id: 1,
    name: "Carnwath",
    slug: "carnwath",
    location: "Carnwath",
    region: "Lanarkshire",
    timesHosted: 1,
    firstHosted: 2013,
    lastHosted: 2013,
    description: "A description.",
    imageLabel: "Carnwath",
    updatedAt: "",
    createdAt: "",
    ...over,
  } as PayloadVenue;
}

const row = (paragraph: string) => ({ paragraph });

describe("mapVenue overview paragraphs", () => {
  it("splits a single row that holds two paragraphs separated by a blank line", () => {
    // Every one of the fifteen venues was filled in this way, and each rendered as one run-on
    // block because a row becomes one <p> and HTML collapses the blank line to a space.
    const venue = mapVenue(doc({ overview: [row("First paragraph.\n\nSecond paragraph.")] }));
    expect(venue.overview).toEqual(["First paragraph.", "Second paragraph."]);
  });

  it("leaves genuinely separate rows alone", () => {
    const venue = mapVenue(doc({ overview: [row("First paragraph."), row("Second paragraph.")] }));
    expect(venue.overview).toEqual(["First paragraph.", "Second paragraph."]);
  });

  it("handles a mix of both shapes", () => {
    const venue = mapVenue(doc({ overview: [row("One.\n\nTwo."), row("Three.")] }));
    expect(venue.overview).toEqual(["One.", "Two.", "Three."]);
  });

  it("treats a blank line with trailing spaces as a break", () => {
    // Pasting from a document routinely leaves whitespace on the "empty" line.
    const venue = mapVenue(doc({ overview: [row("One.\n   \nTwo.")] }));
    expect(venue.overview).toEqual(["One.", "Two."]);
  });

  it("keeps a single newline inside one paragraph rather than splitting on it", () => {
    // A soft wrap is not a paragraph break, and splitting on it would shatter a wrapped sentence.
    const venue = mapVenue(doc({ overview: [row("One line\nstill the same paragraph.")] }));
    expect(venue.overview).toEqual(["One line\nstill the same paragraph."]);
  });

  it("drops an empty row instead of rendering a blank paragraph", () => {
    const venue = mapVenue(doc({ overview: [row("Real."), row("   "), row("")] }));
    expect(venue.overview).toEqual(["Real."]);
  });

  it("gives the film band the first real paragraph, not both glued together", () => {
    // The venue page passes overview[0] to the dark film band beside the video.
    const venue = mapVenue(doc({ overview: [row("Opening paragraph.\n\nSecond paragraph.")] }));
    expect(venue.overview[0]).toBe("Opening paragraph.");
  });

  it("returns an empty list when there is no overview at all", () => {
    expect(mapVenue(doc({ overview: undefined })).overview).toEqual([]);
    expect(mapVenue(doc({ overview: [] })).overview).toEqual([]);
  });

  it("trims leading and trailing whitespace from each paragraph", () => {
    const venue = mapVenue(doc({ overview: [row("  Padded.  \n\n\t Also padded. ")] }));
    expect(venue.overview).toEqual(["Padded.", "Also padded."]);
  });
});
