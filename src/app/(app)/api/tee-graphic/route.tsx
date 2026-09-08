import { ImageResponse } from "next/og";
import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { loadGraphicFonts } from "@/lib/og-fonts";
import {
  TeeGraphic,
  GRAPHIC_WIDTH,
  GRAPHIC_HEIGHT,
  photoCellSize,
  SPONSOR_LOGO_BOX,
  SITE_LOGO_BOX,
  type TeeGraphicData,
} from "@/lib/tee-graphic-layout";
import { preparePhoto, prepareLogo } from "@/lib/tee-graphic-photos";
import type { Player, TeeTimeRound, Venue } from "@/payload-types";

/**
 * Renders one tee-time group as a 1080x1350 PNG, ready to post to Instagram.
 *
 *   /api/tee-graphic?round=15&game=3
 *
 * Runs on the Node runtime rather than Edge because it reads through Payload's local API.
 * Admin-authenticated: the tee-time data behind it is already public, but rendering an image is
 * expensive enough that this should not be an open endpoint.
 *
 * The layout itself lives in @/lib/tee-graphic-layout so it can be rendered without a server.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })
    .format(new Date(iso))
    .toUpperCase();
}

export async function GET(request: NextRequest) {
  const payload = await getPayload({ config: configPromise });
  const { user } = await payload.auth({ headers: request.headers });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const roundId = params.get("round");
  const gameNumber = Number(params.get("game") ?? "1");
  if (!roundId) return NextResponse.json({ error: "round is required" }, { status: 400 });

  const round = (await payload
    .findByID({ collection: "tee-time-rounds", id: roundId, depth: 2 })
    .catch(() => undefined)) as TeeTimeRound | undefined;
  if (!round) return NextResponse.json({ error: "Round not found" }, { status: 404 });

  const group = round.groups?.[gameNumber - 1];
  if (!group) return NextResponse.json({ error: `Game ${gameNumber} not found in this round` }, { status: 404 });

  const origin = request.nextUrl.origin;
  const roster = ((group.players ?? []) as Player[]).filter((p): p is Player => typeof p === "object" && p !== null);

  // Photos are decoded and cropped here rather than by Satori -- see preparePhoto for why.
  const cell = photoCellSize(roster.length);
  const players = await Promise.all(
    roster.map(async (p) => {
      const photo = typeof p.photo === "object" && p.photo ? p.photo : undefined;
      return {
        name: p.name ?? "",
        photoUrl: photo?.url ? await preparePhoto(`${origin}${photo.url}`, cell.width, cell.height) : undefined,
      };
    }),
  );

  const venue = typeof round.venue === "object" ? (round.venue as Venue) : undefined;

  // Edition is counted from every recorded championship rather than stored, matching how the rest
  // of the site labels one (see getActiveChampionshipSummary).
  let editionLabel = "";
  const championshipId = typeof round.championship === "object" && round.championship ? round.championship.id : round.championship;
  if (championshipId) {
    const all = await payload.find({ collection: "championships", limit: 500, depth: 0, sort: "year" });
    const index = all.docs.findIndex((d) => String(d.id) === String(championshipId));
    if (index >= 0) editionLabel = `THE ${ordinal(index + 1)} LEGS OPEN`;
  }

  // Both marks are read from the globals that already drive them elsewhere on the site, so
  // changing a sponsor or the site logo in the admin carries through here with no extra step.
  const [sponsorClock, siteTheme] = await Promise.all([
    payload.findGlobal({ slug: "sponsor-clock", depth: 1 }).catch(() => undefined),
    payload.findGlobal({ slug: "site-theme", depth: 1 }).catch(() => undefined),
  ]);

  const sponsorLogo = (sponsorClock as { sponsor?: { logo?: { url?: string } } } | undefined)?.sponsor?.logo;
  const siteLogo = (siteTheme as { branding?: { logo?: { url?: string } } } | undefined)?.branding?.logo;

  const [sponsorLogoUrl, siteLogoUrl] = await Promise.all([
    sponsorLogo?.url ? prepareLogo(`${origin}${sponsorLogo.url}`, SPONSOR_LOGO_BOX.width, SPONSOR_LOGO_BOX.height) : undefined,
    siteLogo?.url ? prepareLogo(`${origin}${siteLogo.url}`, SITE_LOGO_BOX.width, SITE_LOGO_BOX.height) : undefined,
  ]);

  const data: TeeGraphicData = {
    editionLabel,
    venueName: venue?.name ?? "",
    dateLabel: formatDate(round.date),
    gameNumber,
    time: (group.time ?? "").replace(".", ":"),
    tee: (group.tee ?? "1st").toUpperCase(),
    players,
    sponsorLogoUrl,
    siteLogoUrl,
  };

  const fonts = await loadGraphicFonts();

  return new ImageResponse(TeeGraphic(data), {
    width: GRAPHIC_WIDTH,
    height: GRAPHIC_HEIGHT,
    fonts: fonts.map((f) => ({ name: f.name, data: f.data, weight: f.weight, style: f.style })),
    headers: {
      "Content-Disposition": `inline; filename="game-${gameNumber}-tee-time.png"`,
      "Cache-Control": "no-store",
    },
  });
}
