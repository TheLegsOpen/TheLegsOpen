#!/usr/bin/env node
/**
 * Crop-and-preview helper for the legs-open-photo skill. Uses sharp from the project's own
 * node_modules (run it from the project root).
 *
 *   node .claude/skills/legs-open-photo/crop.cjs info "<photo>"
 *   node .claude/skills/legs-open-photo/crop.cjs master "<photo>" "<output name>" --slot article [--cx 0.5] [--cy 0.5] [--scale 1] [--rotate 0]
 *
 * Writes into photo-work/ (excluded from git): <name>.webp to upload, <name>.jpg as a full-size
 * preview, and <name>-crops.png showing every crop the site takes from it, labelled.
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const OUT = path.resolve(process.cwd(), "photo-work");

// Master size, and the crops the site takes from the centre of the master ([w, h, label]).
// "fit" slots are not cropped, only shrunk to fit inside the box.
const SLOTS = {
  article: { w: 1600, h: 900, crops: [[16, 9, "Article header 16:9"], [4, 3, "News card 4:3"], [1, 1, "Home page square"], [16, 10, "Related thumbnail"]] },
  banner: { w: 2400, h: 800, crops: [[1366, 230, "Slim banner (Leaderboard etc.), laptop"], [1366, 300, "Banner (Field, Records etc.), laptop"], [375, 200, "Banner on a phone"]] },
  champion: { w: 1920, h: 1080, crops: [[1366, 430, "Previous Opens banner, laptop"], [400, 600, "Champion Golfers card"], [224, 340, "Venue strip"]] },
  // A background-removed champion (from tools/bg-remove). Trimmed to the figure, optionally cut
  // at the waist with --keep-top, and previewed standing in the 280x305 leaderboard box.
  cutout: { fit: [1200, 1300], background: "#F2BE3A", trim: true, box: [280, 305], crops: [] },
  venue: { w: 2400, h: 1350, crops: [[1366, 520, "Venue page banner, laptop"], [1366, 300, "Course page banner"], [4, 3, "Upcoming Venues card"]] },
  gallery: { w: 1600, h: 960, crops: [[5, 3, "Gallery slider 5:3"]] },
  player: { fit: [1600, 2020], background: "#06051e", crops: [] },
  hole: { fit: [1193, 2020], background: "#F1ECE6", crops: [] },
};

function args(list) {
  const out = { _: [] };
  for (let i = 0; i < list.length; i++) {
    if (list[i].startsWith("--")) out[list[i].slice(2)] = list[i + 1] === undefined || list[i + 1].startsWith("--") ? "1" : list[++i];
    else out._.push(list[i]);
  }
  return out;
}

function label(text, width) {
  const safe = text.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return Buffer.from(`<svg width="${width}" height="22"><rect width="100%" height="100%" fill="#ffffff"/><text x="4" y="15" font-family="Arial" font-size="13" fill="#222">${safe}</text></svg>`);
}

async function sheet(tiles, file) {
  // tiles: [{ buf, w, h, text }] laid out in one row, each with a label underneath.
  const gap = 12;
  const width = tiles.reduce((s, t) => s + Math.max(t.w, 160) + gap, gap);
  const height = Math.max(...tiles.map((t) => t.h)) + 22 + gap * 2;
  const composite = [];
  let x = gap;
  for (const t of tiles) {
    composite.push({ input: t.buf, left: x, top: gap });
    composite.push({ input: label(t.text, Math.max(t.w, 160)), left: x, top: gap + t.h });
    x += Math.max(t.w, 160) + gap;
  }
  await sharp({ create: { width, height, channels: 3, background: "#cfcfcf" } }).composite(composite).png().toFile(file);
}

async function info(src) {
  fs.mkdirSync(OUT, { recursive: true });
  const meta = await sharp(src).metadata();
  const base = path.parse(src).name;
  const preview = path.join(OUT, `${base}-preview.jpg`);
  await sharp(src).rotate().resize({ width: 1000, height: 1000, fit: "inside" }).jpeg({ quality: 80 }).toFile(preview);
  const rotated = meta.orientation && meta.orientation >= 5;
  console.log(`${rotated ? meta.height : meta.width}x${rotated ? meta.width : meta.height} ${meta.format}${meta.hasAlpha ? " (transparent)" : ""}`);
  console.log(`preview: ${preview}`);
}

async function master(src, name, opts) {
  const slot = SLOTS[opts.slot];
  if (!slot) throw new Error(`--slot must be one of: ${Object.keys(SLOTS).join(", ")}`);
  fs.mkdirSync(OUT, { recursive: true });
  const rotate = Number(opts.rotate ?? 0);
  // Bake in EXIF orientation and any extra rotation first, so the numbers below are in the
  // orientation the user sees.
  const upright = await sharp(src).rotate().toBuffer();
  const base = rotate ? await sharp(upright).rotate(rotate).toBuffer() : upright;
  const meta = await sharp(base).metadata();

  let out;
  if (slot.fit) {
    let src = base;
    if (slot.trim) {
      // Harden the soft edge the model leaves (faint ghosts of the background), then trim to the figure.
      // --soft skips this for a cut-out already tidied by hand, so wispy hair keeps its soft edge.
      const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      if (opts.soft === undefined) for (let i = 3; i < data.length; i += 4) if (data[i] < 110) data[i] = 0;
      src = (await sharp(await sharp(data, { raw: info }).png().toBuffer()).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true })).data;
      const keepTop = Number(opts["keep-top"] ?? 1);
      if (keepTop < 1) {
        const m = await sharp(src).metadata();
        src = await sharp(src).extract({ left: 0, top: 0, width: m.width, height: Math.round(m.height * keepTop) }).toBuffer();
      }
    }
    out = await sharp(src).resize({ width: slot.fit[0], height: slot.fit[1], fit: "inside", withoutEnlargement: true }).png().toBuffer();
  } else {
    const aspect = slot.w / slot.h;
    const cx = Number(opts.cx ?? 0.5) * meta.width;
    const cy = Number(opts.cy ?? 0.5) * meta.height;
    let cw = Number(opts.scale ?? 1) * meta.width;
    let ch = cw / aspect;
    if (ch > meta.height) { ch = meta.height; cw = ch * aspect; }
    const left = Math.round(Math.min(Math.max(cx - cw / 2, 0), meta.width - cw));
    const top = Math.round(Math.min(Math.max(cy - ch / 2, 0), meta.height - ch));
    out = await sharp(base).extract({ left, top, width: Math.round(cw), height: Math.round(ch) }).resize(slot.w, slot.h).toBuffer();
    if (cw < slot.w) console.log(`note: the crop is only ${Math.round(cw)}px wide, so it is being enlarged to ${slot.w}px and may look soft`);
  }

  const webp = path.join(OUT, `${name}.webp`);
  const info = await sharp(out).webp({ quality: 85, alphaQuality: 90 }).toFile(webp);
  await sharp(out).flatten({ background: slot.background ?? "#ffffff" }).jpeg({ quality: 85 }).toFile(path.join(OUT, `${name}.jpg`));

  // The preview sheet: the master, then each crop the site takes from its centre.
  const M = await sharp(out).metadata();
  const tiles = [];
  const previewHeight = 220;
  const masterBuf = await sharp(out).flatten({ background: slot.background ?? "#ffffff" }).resize({ height: previewHeight }).png().toBuffer();
  const mm = await sharp(masterBuf).metadata();
  tiles.push({ buf: masterBuf, w: mm.width, h: mm.height, text: `Master ${M.width}x${M.height}` });
  if (slot.box) {
    // Stood in the leaderboard's winner box, on the row's yellow, bottom-aligned as the site shows it.
    const [bw, bh] = slot.box;
    const fig = await sharp(out).resize({ width: bw, height: bh, fit: "contain", position: "bottom", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    const boxBuf = await sharp({ create: { width: bw, height: bh, channels: 3, background: slot.background } }).composite([{ input: fig }]).png().toBuffer();
    tiles.push({ buf: boxBuf, w: bw, h: bh, text: `Leaderboard box ${bw}x${bh}` });
  }
  for (const [w, h, text] of slot.crops) {
    const a = w / h;
    let cw = M.width;
    let ch = Math.round(M.width / a);
    if (ch > M.height) { ch = M.height; cw = Math.round(M.height * a); }
    const tileH = previewHeight;
    const tileW = Math.round(tileH * a);
    const buf = await sharp(out)
      .extract({ left: Math.round((M.width - cw) / 2), top: Math.round((M.height - ch) / 2), width: cw, height: ch })
      .resize(Math.min(tileW, 700), Math.round(Math.min(tileW, 700) / a))
      .png()
      .toBuffer();
    const bm = await sharp(buf).metadata();
    tiles.push({ buf, w: bm.width, h: bm.height, text });
  }
  const sheetFile = path.join(OUT, `${name}-crops.png`);
  await sheet(tiles, sheetFile);
  console.log(`upload: ${webp} (${info.width}x${info.height}, ${Math.round(info.size / 1024)} KB)`);
  console.log(`crops sheet: ${sheetFile}`);
}

(async () => {
  const a = args(process.argv.slice(2));
  const [cmd, src, name] = a._;
  if (cmd === "info" && src) return info(src);
  if (cmd === "master" && src && name) return master(src, name, a);
  console.log("usage:\n  crop.cjs info <photo>\n  crop.cjs master <photo> <output name> --slot <" + Object.keys(SLOTS).join("|") + "> [--cx 0.5] [--cy 0.5] [--scale 1] [--rotate 0]");
  process.exitCode = 1;
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
