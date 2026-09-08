import { headers as getHeaders } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

import configPromise from "@/payload.config";
import type { TeeTimeRound, Venue } from "@/payload-types";

/**
 * Preview and download the Instagram tee-time graphics produced by /api/tee-graphic.
 *
 * Each tile is a live render rather than a stored file, so editing a group in the admin -- swapping
 * a player, changing a tee time, uploading a better photo -- is reflected the next time this page
 * is loaded. Nothing has to be regenerated or cleaned up.
 */

export const dynamic = "force-dynamic";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(iso),
  );
}

export default async function TeeGraphicsPage({ searchParams }: { searchParams: Promise<{ round?: string }> }) {
  const payload = await getPayload({ config: configPromise });
  const headersList = await getHeaders();
  const { user } = await payload.auth({ headers: headersList });
  if (!user) redirect("/admin/login?redirect=/tee-graphics");

  const { round: roundParam } = await searchParams;

  const roundsResult = await payload.find({
    collection: "tee-time-rounds",
    where: { archived: { not_equals: true } },
    sort: "-date",
    limit: 50,
    depth: 1,
  });
  const rounds = roundsResult.docs as TeeTimeRound[];

  if (rounds.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="font-display text-2xl font-bold">Tee-Time Graphics</h1>
        <p className="mt-4 text-surface-dark-foreground/70">No active tee-time rounds to generate graphics for.</p>
      </main>
    );
  }

  const selected = rounds.find((r) => String(r.id) === roundParam) ?? rounds[0];
  const venue = typeof selected.venue === "object" ? (selected.venue as Venue) : undefined;
  const groups = selected.groups ?? [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold">Tee-Time Graphics</h1>
      <p className="mt-2 max-w-2xl text-sm text-surface-dark-foreground/70">
        One 1080×1350 image per group, sized for an Instagram portrait post. Right-click and save, or use the download button under
        each. Images are generated on demand, so any change made in the admin shows up on the next reload.
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        {rounds.map((r) => {
          const isSelected = r.id === selected.id;
          const rVenue = typeof r.venue === "object" ? (r.venue as Venue) : undefined;
          return (
            <Link
              key={r.id}
              href={`/tee-graphics?round=${r.id}`}
              className={
                isSelected
                  ? "border border-accent bg-accent px-4 py-2 text-sm font-bold text-primary"
                  : "border border-surface-dark-foreground/25 px-4 py-2 text-sm text-surface-dark-foreground/80 hover:border-accent"
              }
            >
              {r.round} · {formatDate(r.date)}
              {rVenue ? ` · ${rVenue.name}` : ""}
            </Link>
          );
        })}
      </div>

      <p className="mt-6 text-sm text-surface-dark-foreground/60">
        {selected.round} round at {venue?.name ?? "unknown course"} — {groups.length} group{groups.length === 1 ? "" : "s"}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((group, index) => {
          const gameNumber = index + 1;
          const src = `/api/tee-graphic?round=${selected.id}&game=${gameNumber}`;
          return (
            <div key={group.id ?? gameNumber} className="flex flex-col gap-3">
              {/* Lazy so nine full renders do not all start at once on page load. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Game ${gameNumber} tee-time graphic`}
                loading="lazy"
                className="w-full border border-surface-dark-foreground/15 bg-surface-dark"
                width={1080}
                height={1350}
              />
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold">
                  Game {gameNumber} · {group.time}
                </span>
                <a
                  href={src}
                  download={`game-${gameNumber}-tee-time.png`}
                  className="border border-accent px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-accent hover:bg-accent hover:text-primary"
                >
                  Download
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
