---
name: legs-open-photo
description: Crop, convert and upload a photo to thelegsopen.com for a specific slot -- an article image, a page banner, a player cut-out, a champion photo, a leaderboard champion cut-out (background removed), a venue image, a gallery photo or a Hole Guide map. Use when the user gives a photo (a file path or a folder) and says where it should go on the site, or types /legs-open-photo.
---

# Legs Open photo

One skill for every image slot on the site. Every run follows the same five steps; only the slot
details (size, crop, admin field, pages to check) change. The slots are in the table below.

Arguments, in the user's words: the photo's path (or a folder of photos) and where it goes, e.g.
`C:\...\photo.jpg for the Balmedie article` or `C:\...\folder as the Castle hole maps`. If either
is missing, ask for it before doing anything.

## The five steps

### 1. Look at the photo

```bash
node .claude/skills/legs-open-photo/crop.cjs info "<photo path>"
```

It prints the size and writes a small preview JPG to `photo-work/` (excluded from git). Read the
preview to see what is in the shot and where the subject sits. Note the subject's centre as
fractions of the width and height (0 = left/top, 1 = right/bottom).

### 2. Crop to the slot's master size and preview every crop the site takes

```bash
node .claude/skills/legs-open-photo/crop.cjs master "<photo path>" "<output name>" --slot article --cx 0.48 --cy 0.55 --scale 0.8
```

- `--slot` picks the master size and the crops to preview (see the table).
- `--cx` / `--cy` put the subject's centre in the middle of the crop.
- `--scale` is how much of the photo's width the crop takes (1 = full width, smaller = tighter).
- Output: `photo-work/<output name>.webp` (the file to upload) and
  `photo-work/<output name>-crops.png` (a sheet showing how it will look in every place the site
  shows it). Read the crops sheet.

The site's crops are taken **from the centre** of the master, so the subject must be centred both
ways, not just side to side, or the square and thumbnail crops lose them.

Show the user the crops sheet and say what each crop is. Where there is a real choice (for example
"keep the whole sign, or get closer on the player"), make two versions and let them pick. **Wait
for their choice before uploading**, unless they have already said to go ahead.

### 3. Name it and write the alt text

- **File name:** say what it is, and prefix by venue or player so it cannot clash with an existing
  file in the media library (Payload silently renames clashes to `name-1.webp`). Examples:
  `Andrew Duncan Balmedie 2025.webp`, `Castle Hole 4.webp`.
- **Alt text:** short, title case, describing the picture, matching the user's existing style:
  "Leisegang Celebrates", "David Clee Celebrates Win", "Andrew Duncan Retains The Claret Jug".
  Hole maps use "Hole 4".
- Always WebP (quality 85). `crop.cjs` does this.

### 4. Upload through the user's signed-in admin (Claude in Chrome)

Never type a password. If the admin shows a login page, ask the user to sign in, then carry on.

1. Open a new tab at the admin page for the thing being changed, e.g.
   `https://thelegsopen.com/admin/collections/articles`.
2. Add a temporary file input to the page with `javascript_tool`:
   ```js
   const inp = document.createElement('input'); inp.type = 'file'; inp.multiple = true;
   inp.id = 'claude-photo-upload'; inp.setAttribute('aria-label', 'Claude photo upload');
   inp.style.cssText = 'position:fixed;top:0;left:0;z-index:99999'; document.body.appendChild(inp);
   window.__files = window.__files || [];
   inp.onchange = () => { for (const f of inp.files) if (!window.__files.some(g => g.name === f.name)) window.__files.push(f); };
   ```
3. `find` "Claude photo upload file input" for its ref, then `file_upload` the WebP(s). **Keep
   each `browser_batch` under 10 MB in total**: the limit is checked across the whole batch, so a
   batch that would go over sends nothing. Two to six files per `file_upload` call.
4. Check the library first so nothing is duplicated:
   `fetch('/api/media?where[filename][like]=<name>&depth=0', {credentials:'include'})`.
5. Add each file to the media library:
   ```js
   const fd = new FormData(); fd.append('file', f, f.name);
   fd.append('_payload', JSON.stringify({ alt: '<alt text>' }));
   const r = await fetch('/api/media', { method: 'POST', body: fd, credentials: 'include' });
   const mediaId = (await r.json()).doc.id;
   ```
   Do at most about nine per `javascript_tool` call; a call that runs past 45 seconds times out.
6. Attach it with the slot's PATCH from the table. For an **array** field (galleries, Hole Guide),
   fetch the document first with `?depth=0` and send back the whole array with the new rows added,
   keeping each existing row's `id`, because Payload replaces arrays wholesale.
7. Remove the temporary input: `document.getElementById('claude-photo-upload')?.remove()`.
8. Close the tab.

Saving through the API runs the same hooks as the admin's Save button, so the live pages refresh
on their own. Do **not** write images in with SQL; that skips the refresh.

### 5. Check it live, then report

Wait about ten seconds, then check each page in the slot's "check" column contains the file name
(URL-encoded, e.g. `Andrew%20Duncan%20Balmedie%202025`):

```bash
curl -s https://thelegsopen.com/<page> | grep -c "<url-encoded name>"
```

Tell the user what went where, the alt text used, and which pages now show it. Always add: **if
you have that item open in another admin tab, reload it before saving**, or its stale copy of the
form can overwrite the change.

## Slots

| Slot | `--slot` | Master | The site shows it | Admin field and PATCH | Check |
|---|---|---|---|---|---|
| Article image | `article` | 1600×900 | 16:9 at the top of the article, 4:3 on news cards, square in the home page's News & Features, small 16:10 thumbnail under Related | `PATCH /api/articles/<id>` `{image: mediaId, _status: "published"}`. Find the id with `/api/articles?where[slug][equals]=<slug>&draft=true` | the article, `/`, `/latest`, plus its venue page and `/previous-opens/<year>` if tagged to a championship |
| Page banner | `banner` | 2400×800 | full-width strip, about 230px tall (Leaderboard, Tee Times, Statistics) or about 300px (Field, Records, Live Blog, Latest News, Venues). Top and bottom cropped on wide screens, sides on phones; page title over the bottom-left | `POST /api/globals/page-banners` `{<field>: mediaId}`. Fields: `leaderboard`, `teeTimes`, `statistics`, `field`, `records`, `liveBlog`, `latest`, `venues` (`playerProfile` exists but is not shown anywhere) | that page |
| Player photo | `player` | the cut-out as supplied, max 2020px tall | trimmed to the golfer automatically and blended into navy: Field grid, profile page, leaderboard, tee-time cards, Head-to-head | `PATCH /api/players/<id>` `{photo: mediaId}` | `/players/<slug>`, `/field` |
| Champion photo | `champion` | 1920×1080, landscape | the banner on `/previous-opens/<year>`, framed at 50% 30% so faces survive (only used there when landscape and 1200px+ wide, otherwise the venue photo shows); the venue's Champion Golfers card (400×600 from the centre); the venue strip fallback (224×340) | `PATCH /api/championships/<id>` `{winnerPhoto: mediaId}` | `/previous-opens/<year>`, `/venues/<slug>`, `/leaderboard` if it is the active year |
| Champion cut-out | `cutout` | the trimmed figure, max 1200×1300, waist up with `--keep-top 0.6` | stood on the yellow winner row of the Main leaderboard, 280×305 on a laptop (theopen.com's size). Without one the row has no picture | `PATCH /api/championships/<id>` `{championCutout: mediaId}` | `/leaderboard` if it is the active year, `/previous-opens/<year>` Results tab |
| Venue image | `venue` | 2400×1350 | the 520px banner at the top of the venue page, the course page, Upcoming Venues cards | `PATCH /api/venues/<id>` `{image: mediaId}` | `/venues/<slug>`, `/venues/<slug>/course` |
| Gallery photo | `gallery` | 1600×960 | a 5:3 slider. Championship gallery = "Best of the [year]" on Previous Opens and the venue slider; venue gallery = the venue slider; player gallery = the profile slider | array field `gallery` on `championships`, `venues` or `players`: `{gallery: [...existing, {image: mediaId, caption}]}` | the page that shows it |
| Hole map | `hole` | max 1193×2020, kept whole | a cream 3:5 panel on `/venues/<slug>/course` | array field `holeImages` on `venues`: rows `{hole, image, description}` | `/venues/<slug>/course`, and the venue page shows The Course card once one hole has an image |

### Slot notes

- **Banner focus:** after uploading a Champion Photo, set the image's focal point on the champion's
  face (`PATCH /api/media/<id>` `{focalX, focalY}` in percent, or the Banner focus picker on the image's
  page in Media). The Previous Opens banner frames on it, so faces stay in shot at every width.

- **Champion cut-outs** need the background removed first. Run the local tool (installed in
  `C:UsersmarkaClaude Shopify	oolsg-remove`, runs on the laptop, nothing uploaded anywhere):
  ```bash
  cd "/c/Users/marka/Claude Shopify/tools/bg-remove" && node remove.mjs "<photo>" out/<name>.png
  ```
  Then `crop.cjs master out/<name>.png "<name>" --slot cutout --keep-top 0.6` (0.6 cuts at the waist;
  1 keeps the whole figure). **Zoom in on the head and edges before uploading.** The tool is very
  good on clothes and trophies but keeps dark shapes that touch the hair, such as sign lettering
  behind the head (it left an "O" from SCOTLAND on Andrew Duncan). Do not try to mask those out
  in code; a straight or oval cut chops the hair. Save a PNG to `photo-work/` and ask the user to
  erase the leftover in Photoshop (eraser or Select Subject), then upload their tidied file.
  Run their tidied file through `--slot cutout --keep-top 0.68 --soft`: `--soft` keeps their soft hair
  edges (without it the helper hardens edges, which is only right for the raw tool output), and
  0.68 keeps the whole trophy including its base in a waist-up figure (check the box preview).
  Photos against a plain background (sky, fairway) cut out cleanly.

- **Player photos** must be a cut-out on plain black or a transparent PNG. Anything else shows as
  a box behind the player. If the user sends an ordinary photo, say so; background removal needs
  Photoshop, which is a different job.
- **Hole maps** are not cropped, only resized. A landscape map is small in the tall panel; rotating
  it a quarter-turn so the hole runs bottom to top fills it better. Use `--rotate 270` and tell
  the user, since north is then at the side. Maps on white backgrounds show as a white card on the
  cream panel, which is fine.
- **Hole descriptions** from a club's website or yardage book belong to the club. Write fresh notes
  in our own words from the same facts, and leave par and yardage out where our scorecard
  disagrees with theirs (the panel shows ours).
- A **PDF yardage guide** works: render the map pages with Poppler (`pdftoppm -r 200 -png`), which
  is installed under `%LOCALAPPDATA%\Microsoft\WinGet\Packages\oschwartz10612.Poppler_*`, and read
  the notes with `pdftotext -layout`.
- **Many files at once:** build a contact sheet (all thumbnails in a grid) and read it to confirm
  each image matches its number before uploading.
