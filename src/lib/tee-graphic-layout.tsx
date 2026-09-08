/**
 * The visual layout for a tee-time group graphic, kept separate from the route that feeds it
 * (see /api/tee-graphic) so it can be rendered from a harness without a running server.
 *
 * Everything here has to stay inside the subset of CSS that Satori supports: flexbox only (no
 * grid), no filters, no blend modes, and every element with children needs an explicit display.
 */

export const GRAPHIC_WIDTH = 1080;
/** Instagram's portrait slot is 4:5, and 1080x1350 is the largest it accepts uncompressed. */
export const GRAPHIC_HEIGHT = 1350;

const NAVY = "#06051E";
const GOLD = "#FFB800";

/**
 * The photo grid stops short of the bottom so the details sit on solid navy rather than on a
 * player's face. The first version ran photos to the full height and put the text over them: the
 * bottom two players ended up unreadable behind the wash needed to make the type legible.
 */
const PHOTO_BLOCK_HEIGHT = 990;
const PANEL_TOP = PHOTO_BLOCK_HEIGHT;

/**
 * The pixel size of one player's cell, for a group of `playerCount`. Exported so photos can be
 * cropped to exactly the box they are drawn into (see preparePhoto) instead of being scaled by the
 * renderer -- the two must agree, so the arithmetic lives in one place.
 */
export function photoCellSize(playerCount: number): { width: number; height: number } {
  const perRow = Math.ceil(Math.max(playerCount, 1) / 2);
  const rowCount = playerCount > perRow ? 2 : 1;
  return { width: GRAPHIC_WIDTH / perRow, height: PHOTO_BLOCK_HEIGHT / rowCount };
}

export interface TeeGraphicData {
  /** e.g. "THE 3RD LEGS OPEN" -- omitted for a round with no championship. */
  editionLabel: string;
  venueName: string;
  /** e.g. "SATURDAY 12 SEPTEMBER" */
  dateLabel: string;
  gameNumber: number;
  time: string;
  tee: string;
  players: { name: string; photoUrl?: string }[];
  /** Sponsor mark, bottom left. Omitted if the Sponsor Clock global has no logo set. */
  sponsorLogoUrl?: string;
  /** The Legs Open mark, bottom right. Omitted if Site Theme has no logo set. */
  siteLogoUrl?: string;
}

/** Logo boxes, and the strip they sit in at the foot of the card. */
export const SPONSOR_LOGO_BOX = { width: 150, height: 62 };
export const SITE_LOGO_BOX = { width: 84, height: 66 };

function PhotoRow({ photos, height }: { photos: { photoUrl?: string }[]; height: number }) {
  const cellWidth = GRAPHIC_WIDTH / Math.max(photos.length, 1);
  return (
    <div style={{ display: "flex", flexDirection: "row", width: GRAPHIC_WIDTH, height }}>
      {photos.map((photo, i) => (
        <div key={i} style={{ display: "flex", width: cellWidth, height, backgroundColor: "#12122e", overflow: "hidden" }}>
          {photo.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo.photoUrl}
              width={cellWidth}
              height={height}
              // Biased above centre: these are head-and-shoulders portraits, so a straight centre
              // crop of a near-square source trims the top of the head before it trims the chest.
              style={{ objectFit: "cover", objectPosition: "center 30%" }}
              alt=""
            />
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
      <div style={{ display: "flex", flexDirection: "column", position: "absolute", top: 0, left: 0, width: GRAPHIC_WIDTH, height: PHOTO_BLOCK_HEIGHT }}>
        <PhotoRow photos={topRow} height={bottomRow.length > 0 ? PHOTO_BLOCK_HEIGHT / 2 : PHOTO_BLOCK_HEIGHT} />
        {bottomRow.length > 0 ? <PhotoRow photos={bottomRow} height={PHOTO_BLOCK_HEIGHT / 2} /> : null}
      </div>

      {/* Darkening wash. Kept far lighter across the middle than the first attempt -- enough to hold
       * white type, not so much that the players disappear -- and ramped to solid only at the very
       * bottom so the photo block joins the details panel without a visible seam. */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: 0,
          left: 0,
          width: GRAPHIC_WIDTH,
          height: PHOTO_BLOCK_HEIGHT,
          backgroundImage: `linear-gradient(180deg, rgba(6,5,30,0.88) 0%, rgba(6,5,30,0.18) 16%, rgba(6,5,30,0.12) 46%, rgba(6,5,30,0.55) 88%, ${NAVY} 100%)`,
        }}
      />

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "absolute", top: 54, left: 0, width: GRAPHIC_WIDTH }}>
        <div style={{ display: "flex", fontFamily: "Playfair", fontWeight: 700, fontSize: 34, color: "#FFFFFF", letterSpacing: 4 }}>
          {data.editionLabel}
        </div>
        <div style={{ display: "flex", fontFamily: "SourceSans", fontSize: 22, color: "rgba(255,255,255,0.7)", letterSpacing: 8, marginTop: 12 }}>
          {data.venueName.toUpperCase()}
        </div>
      </div>

      {/* Details, centred on solid navy below the photos. */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          position: "absolute",
          top: PANEL_TOP + 24,
          left: 0,
          width: GRAPHIC_WIDTH,
        }}
      >
        <div style={{ display: "flex", fontFamily: "SourceSans", fontWeight: 700, fontSize: 25, color: "rgba(255,255,255,0.8)", letterSpacing: 3 }}>
          {`GAME ${data.gameNumber} — ${data.dateLabel}`}
        </div>
        <div style={{ display: "flex", fontFamily: "SourceSans", fontWeight: 700, fontSize: 44, color: GOLD, letterSpacing: 2, marginTop: 0 }}>
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

      {/* Sponsor left, Legs Open right, in the bottom corners. They sit alongside the centred
       * names rather than below them -- the names are constrained to the middle 620px, so the two
       * marks tuck into the space either side without the panel needing to grow. */}
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
