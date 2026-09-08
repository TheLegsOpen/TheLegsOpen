/**
 * The visual layout for a tee-time group graphic, kept separate from the route that feeds it
 * (see /api/tee-graphic) so it can be rendered from a harness without a running server.
 *
 * Everything here has to stay inside the subset of CSS that Satori supports: flexbox only (no
 * grid), NO filters of any kind, no blend modes, and every element with children needs an explicit
 * display. Anything that needs blurring, cropping or format conversion is done with sharp before it
 * gets here -- see tee-graphic-photos.
 */

export const GRAPHIC_WIDTH = 1080;
/** Instagram's portrait slot is 4:5, and 1080x1350 is the largest it accepts uncompressed. */
export const GRAPHIC_HEIGHT = 1350;

const NAVY = "#06051E";
const GOLD = "#FFB800";

/** Inset of the photo mosaic from the card edge, and the gutter between tiles. The blurred course
 * photo shows through both, which is what makes the tiles read as deliberately placed rather than
 * as a grid that happens to have gaps. */
const OUTER_PAD = 34;
const GUTTER = 24;
/** Where the photo mosaic ends and the details panel begins. */
const PANEL_TOP = 975;

/**
 * The pixel size of one player's tile, for a group of `playerCount`. Exported so photos can be
 * cropped to exactly the box they are drawn into (see preparePhoto) instead of being scaled by the
 * renderer -- the two must agree, so the arithmetic lives in one place.
 */
export function photoCellSize(playerCount: number): { width: number; height: number } {
  const perRow = Math.ceil(Math.max(playerCount, 1) / 2);
  const rowCount = playerCount > perRow ? 2 : 1;
  const usableWidth = GRAPHIC_WIDTH - OUTER_PAD * 2 - GUTTER * (perRow - 1);
  const usableHeight = PANEL_TOP - OUTER_PAD * 2 - GUTTER * (rowCount - 1);
  return { width: Math.floor(usableWidth / perRow), height: Math.floor(usableHeight / rowCount) };
}

export interface TeeGraphicData {
  /** e.g. "SATURDAY 12 SEPTEMBER" */
  dateLabel: string;
  gameNumber: number;
  time: string;
  tee: string;
  players: { name: string; photoUrl?: string }[];
  /** Blurred course photo behind everything. Omitted if the venue has no image set. */
  backgroundUrl?: string;
  /** Sponsor mark, bottom left. Omitted if the Sponsor Clock global has no logo set. */
  sponsorLogoUrl?: string;
  /** The Legs Open mark, bottom right. Omitted if Site Theme has no logo set. */
  siteLogoUrl?: string;
}

/** Logo boxes at the foot of the card. */
export const SPONSOR_LOGO_BOX = { width: 150, height: 62 };
export const SITE_LOGO_BOX = { width: 84, height: 66 };

function PhotoRow({ photos, cell, isFirstRow }: { photos: { photoUrl?: string }[]; cell: { width: number; height: number }; isFirstRow: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "row", marginTop: isFirstRow ? 0 : GUTTER }}>
      {photos.map((photo, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            width: cell.width,
            height: cell.height,
            marginLeft: i === 0 ? 0 : GUTTER,
            // Sits under the photo, so a player whose photo failed to load leaves a dark tile
            // rather than a hole showing the blurred course.
            backgroundColor: "#0d0c24",
            overflow: "hidden",
          }}
        >
          {photo.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo.photoUrl} width={cell.width} height={cell.height} alt="" />
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function TeeGraphic(data: TeeGraphicData) {
  const half = Math.ceil(data.players.length / 2);
  const topRow = data.players.slice(0, half);
  const bottomRow = data.players.slice(half);
  const cell = photoCellSize(data.players.length);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: GRAPHIC_WIDTH,
        height: GRAPHIC_HEIGHT,
        position: "relative",
        backgroundColor: NAVY,
      }}
    >
      {data.backgroundUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={data.backgroundUrl}
          width={GRAPHIC_WIDTH}
          height={GRAPHIC_HEIGHT}
          alt=""
          style={{ position: "absolute", top: 0, left: 0 }}
        />
      ) : null}

      {/* Wash over the backdrop only -- deliberately placed before the tiles so it deepens the
       * course photo without dulling the players. */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: 0,
          left: 0,
          width: GRAPHIC_WIDTH,
          height: GRAPHIC_HEIGHT,
          backgroundImage: `linear-gradient(180deg, rgba(6,5,30,0.30) 0%, rgba(6,5,30,0.12) 32%, rgba(6,5,30,0.28) 72%, rgba(6,5,30,0.55) 100%)`,
        }}
      />

      <div style={{ display: "flex", flexDirection: "column", position: "absolute", top: OUTER_PAD, left: OUTER_PAD }}>
        <PhotoRow photos={topRow} cell={cell} isFirstRow />
        {bottomRow.length > 0 ? <PhotoRow photos={bottomRow} cell={cell} isFirstRow={false} /> : null}
      </div>

      {/* Details panel: translucent rather than solid, so the blurred course still reads through it
       * instead of the card ending in a flat navy block. */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          position: "absolute",
          top: PANEL_TOP,
          left: 0,
          width: GRAPHIC_WIDTH,
          height: GRAPHIC_HEIGHT - PANEL_TOP,
          backgroundColor: "rgba(6,5,30,0.82)",
          paddingTop: 26,
        }}
      >
        <div style={{ display: "flex", fontFamily: "SourceSans", fontWeight: 700, fontSize: 25, color: "rgba(255,255,255,0.8)", letterSpacing: 3 }}>
          {`GAME ${data.gameNumber} — ${data.dateLabel}`}
        </div>
        <div style={{ display: "flex", fontFamily: "SourceSans", fontWeight: 700, fontSize: 44, color: GOLD, letterSpacing: 2 }}>
          {`${data.time} · ${data.tee} TEE`}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: 12,
            paddingTop: 12,
            borderTop: "2px solid rgba(255,255,255,0.22)",
            width: 620,
          }}
        >
          {data.players.map((p, i) => (
            <div
              key={i}
              style={{ display: "flex", fontFamily: "SourceSans", fontWeight: 700, fontSize: 31, color: "#FFFFFF", letterSpacing: 4, lineHeight: 1.24 }}
            >
              {p.name.toUpperCase()}
            </div>
          ))}
        </div>
      </div>

      {/* Sponsor left, Legs Open right. They sit either side of the centred names, which are
       * constrained to the middle 620px, so the panel does not need to grow to fit them. */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "space-between",
          position: "absolute",
          bottom: 34,
          left: 60,
          width: GRAPHIC_WIDTH - 120,
        }}
      >
        <div style={{ display: "flex", width: SPONSOR_LOGO_BOX.width, height: SPONSOR_LOGO_BOX.height }}>
          {data.sponsorLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.sponsorLogoUrl} width={SPONSOR_LOGO_BOX.width} height={SPONSOR_LOGO_BOX.height} alt="" />
          ) : null}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", width: SITE_LOGO_BOX.width, height: SITE_LOGO_BOX.height }}>
          {data.siteLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.siteLogoUrl} width={SITE_LOGO_BOX.width} height={SITE_LOGO_BOX.height} alt="" />
          ) : null}
        </div>
      </div>
    </div>
  );
}
