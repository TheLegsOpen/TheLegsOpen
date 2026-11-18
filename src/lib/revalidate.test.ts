import { beforeEach, describe, expect, it, vi } from "vitest";

const { revalidateTag, revalidatePath } = vi.hoisted(() => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("next/cache", () => ({ revalidateTag, revalidatePath, unstable_cache: vi.fn() }));

import { DATA_TAGS, scorecardsTagFor } from "@/lib/data-cache";
import { revalidateScorecards } from "@/lib/revalidate";

function expiredTags(): string[] {
  return revalidateTag.mock.calls.map(([tag]) => tag as string);
}

describe("revalidateScorecards", () => {
  beforeEach(() => {
    revalidateTag.mockClear();
    revalidatePath.mockClear();
  });

  it("expires the live board and only the saved card's own year", () => {
    revalidateScorecards({ doc: { championship: 27 }, previousDoc: { championship: 27 } });
    expect(expiredTags()).toEqual([DATA_TAGS.scorecards, scorecardsTagFor("27")]);
  });

  it("never expires the history tag the past-year boards and career tables share", () => {
    revalidateScorecards({ doc: { championship: { id: 27 } } });
    expect(expiredTags()).not.toContain(DATA_TAGS.scorecardHistory);
    expect(expiredTags()).not.toContain(DATA_TAGS.championships);
  });

  it("expires both years when an edit moves a card to another championship", () => {
    revalidateScorecards({ doc: { championship: 27 }, previousDoc: { championship: { id: 14 } } });
    expect(expiredTags()).toEqual([DATA_TAGS.scorecards, scorecardsTagFor("27"), scorecardsTagFor("14")]);
  });

  it("touches no year for a practice-round card", () => {
    revalidateScorecards({ doc: { championship: null } });
    expect(expiredTags()).toEqual([DATA_TAGS.scorecards]);
  });
});
