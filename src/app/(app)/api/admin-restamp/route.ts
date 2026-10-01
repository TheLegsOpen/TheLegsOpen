import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";

import configPromise from "@/payload.config";

/**
 * Re-times a replayed championship's live blog against the real tee sheet.
 *
 * The 2022 and 2023 reruns were driven from invented tee times. The scripts looked for a `teeTime`
 * field on each tee-time group; the field is called `time`, so the lookup came back empty and the
 * replay fell back to a reconstruction -- noon off the first tee for 2022, 10am for 2023, both at
 * uniform nine-minute intervals. The real sheets were stored all along, and neither is uniform.
 *
 * The scores, handicaps, leaderboards and countbacks never depended on any of this. Only the
 * timestamps the posts carry are wrong, so this moves them rather than replaying the round.
 *
 * Each post is matched back to the tick that produced it and re-stamped at that tick's real
 * moment, keeping its millisecond offset so the order within a tick survives:
 *
 *   - A post naming a player whose group has a tick at that minute belongs to that tick.
 *   - A reaction post ("X draws level", fired by somebody else's score) has no tick of its own.
 *     Posts written in one request carry a continuous millisecond run, so it inherits the tick of
 *     its nearest neighbour in that run -- the request that triggered it.
 *   - Anything still unmatched falls back to the year's median shift, which is within a few
 *     minutes of right wherever the two models run close to parallel.
 *
 * Dry run by default.
 *
 *   /api/admin-restamp                             list what's on offer
 *   /api/admin-restamp?year=2023                   show every move it would make
 *   /api/admin-restamp?year=2023&confirm=RESTAMP   apply it
 *
 * Open it in a browser already signed in to the admin.
 */

export const dynamic = "force-dynamic";

/** Matches the replay scripts: a hole takes this many minutes to play. */
const HOLE_MINUTES: Record<number, number> = { 3: 10, 4: 13, 5: 15 };

interface Plan {
  year: number;
  /** Tee times as the replay used them, and as the tee sheet actually records them. "12.09" is 12.09pm. */
  played: { firstTeeOff: string; times: string[] };
  real: { firstTeeOff: string; times: string[] };
  /** Group membership, which the two models share -- only the times differed. */
  groups: string[][];
  note: string;
}

const PLANS: Plan[] = [
  {
    year: 2023,
    played: { firstTeeOff: "2023-09-10T10:00:00+01:00", times: ["10.00", "10.09", "10.18", "10.27", "10.36", "10.45", "10.54"] },
    real: { firstTeeOff: "2023-09-10T11:00:00+01:00", times: ["11.00", "11.10", "11.20", "11.30", "11.40", "11.50", "12.00"] },
    groups: [
      ["Lloyd Swan", "Neal Eadie", "Mark Kennedy", "Kevin Park"],
      ["Doug Scott", "Michael Holton", "Barry Thomas", "Toby Stanton"],
      ["Grant Robertson", "Colin Howieson", "Mark Alston", "John McAlpine"],
      ["Sandy Hogg", "David McGowan", "Martin McErlean", "Keiran Dougan"],
      ["Fraser Donaldson", "Bryan Forbes", "David Clee", "Andrew Spiers"],
      ["Tom Sinton", "Stephen Magowan", "Stevie Connelly", "Owen Watters"],
      ["Stevie Anderson", "Robert Hamilton", "Colum Watters", "David Pow"],
    ],
    note:
      "An hour early throughout. The replay used nine-minute intervals where the sheet has ten, so " +
      "beyond the hour the field drifts by at most four minutes and the running order barely moves.",
  },
];

function offsetMinutes(teeOff: string, first: string): number {
  const [h, m] = teeOff.split(".").map(Number);
  const [h0, m0] = first.split(".").map(Number);
  return h * 60 + m - (h0 * 60 + m0);
}

/** Every tick's moment under one tee model, keyed "game:hole". */
function tickTimes(par: number[], firstTeeOff: string, times: string[]): Map<string, Date> {
  const base = new Date(firstTeeOff);
  const out = new Map<string, Date>();
  times.forEach((teeOff, index) => {
    let elapsed = offsetMinutes(teeOff, times[0]);
    for (let hole = 1; hole <= 18; hole++) {
      elapsed += HOLE_MINUTES[par[hole - 1]];
      out.set(`${index + 1}:${hole}`, new Date(base.getTime() + elapsed * 60_000));
    }
  });
  return out;
}

const minuteKey = (d: Date) => d.toISOString().slice(0, 16);

export async function GET(request: NextRequest) {
  const payload = await getPayload({ config: configPromise });
  const { user } = await payload.auth({ headers: request.headers });
  if (!user) return NextResponse.json({ error: "Unauthorized -- open this while signed in to the admin" }, { status: 401 });

  const yearParam = request.nextUrl.searchParams.get("year");
  const confirmed = request.nextUrl.searchParams.get("confirm") === "RESTAMP";

  if (!yearParam) {
    return NextResponse.json({
      available: PLANS.map((p) => ({ year: p.year, note: p.note })),
      usage: "Add ?year=2023 to see every move, then &confirm=RESTAMP to apply it.",
    });
  }

  const plan = PLANS.find((p) => String(p.year) === yearParam);
  if (!plan) {
    return NextResponse.json({ error: `No restamp declared for ${yearParam}`, available: PLANS.map((p) => p.year) }, { status: 404 });
  }

  const championships = await payload.find({ collection: "championships", where: { year: { equals: plan.year } }, limit: 1, depth: 1 });
  const championship = championships.docs[0];
  if (!championship) return NextResponse.json({ error: `No championship for ${plan.year}` }, { status: 404 });

  const venue = typeof championship.venue === "object" ? championship.venue : undefined;
  const holes = venue?.holes ?? [];
  if (holes.length !== 18) {
    return NextResponse.json({ error: `Venue for ${plan.year} does not have 18 holes recorded, so par is unknown` }, { status: 409 });
  }
  const par = [...holes].sort((a, b) => (a.holeNumber ?? 0) - (b.holeNumber ?? 0)).map((h) => h.par as number);

  const playedTicks = [...tickTimes(par, plan.played.firstTeeOff, plan.played.times)].map(([k, at]) => ({ game: Number(k.split(":")[0]), hole: Number(k.split(":")[1]), at }));
  const realTicks = tickTimes(par, plan.real.firstTeeOff, plan.real.times);

  const groupOf = new Map<string, number>();
  plan.groups.forEach((names, i) => names.forEach((n) => groupOf.set(n, i + 1)));

  const found = await payload.find({
    collection: "live-blog-posts",
    where: { championship: { equals: championship.id } },
    limit: 1000,
    depth: 1,
    sort: "postedAt",
  });
  const posts = found.docs.map((d) => ({
    id: d.id,
    postedAt: d.postedAt as string,
    headline: d.headline as string,
    playerName: typeof d.player === "object" && d.player ? (d.player.name as string) : undefined,
  }));

  const byMinute = new Map<string, typeof posts>();
  for (const post of posts) {
    const k = minuteKey(new Date(post.postedAt));
    if (!byMinute.has(k)) byMinute.set(k, []);
    byMinute.get(k)!.push(post);
  }

  const moves: { id: string; headline: string; from: string; to: string; how: string }[] = [];
  const stranded: { id: string; headline: string; postedAt: string }[] = [];

  for (const [k, batchRaw] of byMinute) {
    const batch = [...batchRaw].sort((a, b) => new Date(a.postedAt).getTime() - new Date(b.postedAt).getTime());
    const candidates = playedTicks.filter((t) => minuteKey(t.at) === k);
    const own = batch.map((post) => {
      if (post.playerName && groupOf.has(post.playerName)) return candidates.find((t) => t.game === groupOf.get(post.playerName!));
      return candidates.length === 1 ? candidates[0] : undefined;
    });

    batch.forEach((post, i) => {
      let tick = own[i];
      let how = "group";
      if (!tick) {
        for (let j = i - 1; j >= 0 && !tick; j--) tick = own[j];
        for (let j = i + 1; j < batch.length && !tick; j++) tick = own[j];
        if (tick) how = "neighbour";
      }
      if (!tick) {
        stranded.push({ id: String(post.id), headline: post.headline, postedAt: post.postedAt });
        return;
      }
      const ms = new Date(post.postedAt).getTime() % 60_000;
      const to = new Date(realTicks.get(`${tick.game}:${tick.hole}`)!.getTime() + ms);
      moves.push({ id: String(post.id), headline: post.headline, from: post.postedAt, to: to.toISOString(), how });
    });
  }

  // Anything no tick claimed takes the median shift, which keeps it beside its neighbours.
  const shifts = moves.map((m) => new Date(m.to).getTime() - new Date(m.from).getTime()).sort((a, b) => a - b);
  const medianShift = shifts.length ? shifts[Math.floor(shifts.length / 2)] : 0;
  for (const post of stranded) {
    moves.push({
      id: post.id,
      headline: post.headline,
      from: post.postedAt,
      to: new Date(new Date(post.postedAt).getTime() + medianShift).toISOString(),
      how: "median",
    });
  }

  const summary = {
    year: plan.year,
    championshipId: championship.id,
    venue: venue?.name,
    posts: posts.length,
    moving: moves.length,
    by: {
      group: moves.filter((m) => m.how === "group").length,
      neighbour: moves.filter((m) => m.how === "neighbour").length,
      median: moves.filter((m) => m.how === "median").length,
    },
    medianShiftMinutes: Math.round(medianShift / 60_000),
    window: {
      from: `${posts[0]?.postedAt?.slice(11, 16)} - ${posts[posts.length - 1]?.postedAt?.slice(11, 16)} UTC`,
      to: `${moves.map((m) => m.to).sort()[0]?.slice(11, 16)} - ${moves.map((m) => m.to).sort().slice(-1)[0]?.slice(11, 16)} UTC`,
    },
  };

  if (!confirmed) {
    return NextResponse.json({
      dryRun: true,
      message: "Nothing changed. Re-run with &confirm=RESTAMP to apply.",
      note: plan.note,
      summary,
      sample: moves.slice(0, 12).map((m) => ({ headline: m.headline, from: m.from.slice(11, 23), to: m.to.slice(11, 23), how: m.how })),
    });
  }

  let applied = 0;
  const failures: { id: string; message: string }[] = [];
  for (const move of moves) {
    try {
      // context.suppressLiveBlog keeps the generator out of this -- a timestamp edit is not play.
      await payload.update({ collection: "live-blog-posts", id: move.id, data: { postedAt: move.to }, context: { suppressLiveBlog: true } });
      applied++;
    } catch (err) {
      failures.push({ id: move.id, message: err instanceof Error ? err.message : "failed" });
    }
  }

  return NextResponse.json({ ok: failures.length === 0, applied, failed: failures.length, failures: failures.slice(0, 10), summary });
}
