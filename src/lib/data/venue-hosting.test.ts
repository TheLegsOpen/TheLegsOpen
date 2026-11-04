import { describe, expect, it, vi } from "vitest";

import { computeVenueHosting, syncVenueHostingAfterChange, syncVenueHostingAfterDelete } from "@/lib/data/venue-hosting";

/**
 * A payload stub holding championships keyed by venue id. Only `find` and `update` are used by the
 * code under test, so only those are implemented; calls are recorded so the tests can assert which
 * venues were recounted and with what.
 */
function fakePayload(byVenue: Record<string, number[]>) {
  const updates: { id: unknown; data: unknown; context: unknown }[] = [];
  const payload = {
    find: vi.fn(async ({ where }: { where: { venue: { equals: string | number } } }) => {
      const years = byVenue[String(where.venue.equals)] ?? [];
      return { docs: years.map((year) => ({ year })) };
    }),
    update: vi.fn(async ({ id, data, context }: { id: unknown; data: unknown; context: unknown }) => {
      updates.push({ id, data, context });
      return {};
    }),
  };
  return { payload, updates };
}

// The hooks are typed against Payload's full hook argument objects; the code only reads doc,
// previousDoc and req.payload, so the tests pass just those.
const asHookArgs = (args: Record<string, unknown>) => args as never;

describe("computeVenueHosting", () => {
  it("reports a venue that has never hosted as 0/0/0 rather than null", async () => {
    // The three fields are `required`, so null would fail validation on save.
    const { payload } = fakePayload({});
    await expect(computeVenueHosting(payload as never, 12)).resolves.toEqual({ timesHosted: 0, firstHosted: 0, lastHosted: 0 });
  });

  it("collapses a single hosting to the same first and last year", async () => {
    const { payload } = fakePayload({ "7": [2025] });
    await expect(computeVenueHosting(payload as never, 7)).resolves.toEqual({ timesHosted: 1, firstHosted: 2025, lastHosted: 2025 });
  });

  it("takes the earliest and latest year regardless of the order they come back in", async () => {
    const { payload } = fakePayload({ "3": [2018, 2013, 2024, 2016] });
    await expect(computeVenueHosting(payload as never, 3)).resolves.toEqual({ timesHosted: 4, firstHosted: 2013, lastHosted: 2024 });
  });

  it("ignores a championship with no year rather than counting it as 0", async () => {
    // A 0 would otherwise sort to the front and be reported as firstHosted.
    const { payload } = fakePayload({});
    payload.find = vi.fn(async () => ({ docs: [{ year: 2019 }, { year: null }, { year: undefined }, { year: 2021 }] })) as never;
    await expect(computeVenueHosting(payload as never, 1)).resolves.toEqual({ timesHosted: 2, firstHosted: 2019, lastHosted: 2021 });
  });

  it("would have corrected the three venues that were wrong in November 2026", async () => {
    const { payload } = fakePayload({ carnwath: [2013], dundonald: [2014], southerness: [2016] });
    await expect(computeVenueHosting(payload as never, "carnwath")).resolves.toMatchObject({ firstHosted: 2013 });
    await expect(computeVenueHosting(payload as never, "dundonald")).resolves.toMatchObject({ firstHosted: 2014 });
    await expect(computeVenueHosting(payload as never, "southerness")).resolves.toMatchObject({ firstHosted: 2016 });
  });
});

describe("syncVenueHostingAfterChange", () => {
  it("recounts the venue a championship was added to", async () => {
    const { payload, updates } = fakePayload({ "5": [2027] });
    await syncVenueHostingAfterChange(asHookArgs({ doc: { venue: 5 }, previousDoc: undefined, req: { payload } }));
    expect(updates).toEqual([{ id: 5, data: { timesHosted: 1, firstHosted: 2027, lastHosted: 2027 }, context: { skipHostingDerive: true } }]);
  });

  it("recounts both venues when a championship is moved between them", async () => {
    // The venue it left loses a year and the one it joined gains one, so counting only the new
    // venue would leave the old one overstating how often it has hosted.
    const { payload, updates } = fakePayload({ "1": [], "2": [2026] });
    await syncVenueHostingAfterChange(asHookArgs({ doc: { venue: 2 }, previousDoc: { venue: 1 }, req: { payload } }));
    expect(updates.map((u) => u.id).sort()).toEqual([1, 2]);
    expect(updates.find((u) => u.id === 1)?.data).toEqual({ timesHosted: 0, firstHosted: 0, lastHosted: 0 });
    expect(updates.find((u) => u.id === 2)?.data).toEqual({ timesHosted: 1, firstHosted: 2026, lastHosted: 2026 });
  });

  it("updates a venue once when the championship did not move", async () => {
    const { payload, updates } = fakePayload({ "9": [2020] });
    await syncVenueHostingAfterChange(asHookArgs({ doc: { venue: 9 }, previousDoc: { venue: 9 }, req: { payload } }));
    expect(updates).toHaveLength(1);
  });

  it("accepts a populated relationship as well as a bare id", async () => {
    // depth > 0 hands the hook the whole venue document instead of its id.
    const { payload, updates } = fakePayload({ "4": [2015] });
    await syncVenueHostingAfterChange(asHookArgs({ doc: { venue: { id: 4, name: "Lanark" } }, previousDoc: undefined, req: { payload } }));
    expect(updates[0]?.id).toBe(4);
  });

  it("does nothing when the championship has no venue set", async () => {
    const { payload, updates } = fakePayload({});
    await syncVenueHostingAfterChange(asHookArgs({ doc: { venue: null }, previousDoc: null, req: { payload } }));
    expect(updates).toHaveLength(0);
  });

  it("marks its own write so the venue hook does not recount underneath it", async () => {
    const { payload, updates } = fakePayload({ "6": [2022] });
    await syncVenueHostingAfterChange(asHookArgs({ doc: { venue: 6 }, previousDoc: undefined, req: { payload } }));
    expect(updates[0]?.context).toEqual({ skipHostingDerive: true });
  });
});

describe("syncVenueHostingAfterDelete", () => {
  it("recounts the venue after its championship is deleted", async () => {
    const { payload, updates } = fakePayload({ "8": [] });
    await syncVenueHostingAfterDelete(asHookArgs({ doc: { venue: 8 }, req: { payload } }));
    expect(updates).toEqual([{ id: 8, data: { timesHosted: 0, firstHosted: 0, lastHosted: 0 }, context: { skipHostingDerive: true } }]);
  });
});
