# The Legs Open

The website and live scoring for The Legs Open, a golf society's annual championship (since 2013),
styled after theopen.com. Next.js 16 / React 19 with Payload CMS 3 as the admin, on Supabase
Postgres, deployed on Vercel (region lhr1). Live at thelegsopen.com.

- `src/app/(app)`: the public site. `(payload)`: the Payload admin. `(scoring)`: the course-side
  `/score` app. `(tools)`: admin-only tools (bulk players, scoring admin, tee graphics).
- `src/collections`, `src/globals`: the Payload schema. `src/lib`: data, scoring and
  leaderboard logic, with tests next to the code.

## Commands

- `npm test` (Vitest), `npm run lint` (ESLint), `npx tsc --noEmit` (about 10s; a hook runs it
  after every .ts/.tsx edit). These three are how you verify a change.
- **No formatter.** There's no Prettier config, and the code is hand-formatted with lines up to
  about 150 characters. Running Prettier once turned a 145-line change into 671. Match the
  surrounding style by hand.

## Deploying

- **Pushing `master` deploys production.** Commit or push only when asked. Batch pushes: frozen
  instances from many deploys in a row once filled the Supabase pooler (EMAXCONN, below).
- To show the user something before it goes live, push a `preview/<name>` branch. Its URL is
  `https://the-legs-open-git-preview-<name>-the-legs-open.vercel.app`, behind Vercel login, so
  view it in the user's Chrome. Previews use a read-only database login, so admin saves fail
  there by design.
- The local dev server works, but it's very slow (a cold player page makes about 1,500 queries).
  Prefer a preview branch. If it runs, it rewrites `src/app/(payload)/admin/importMap.js`:
  restore that with `git checkout` and don't commit it. `generate:importmap` can't run here, so
  new admin components are added to the import map by hand.

## The database

- **Nothing local can write to production.** `.env.local` uses the read-only `legs_preview`
  login, and a hook blocks edits to `.env*` files. Production changes go through the admin, or
  through SQL the user runs in the Supabase SQL editor. Never print a connection string.
- **There are no migrations** (`push: false`). Any change to a collection or global that touches
  the database means hand-written SQL that the user runs before the deploy. Use
  `/schema-change`: it covers the three traps that have each broken production. Those are the
  `_articles_v` drafts mirror, the `payload_locked_documents_rels` column for a new collection,
  and RLS plus `legs_preview` read access on a new table.
- **SQL writes skip revalidation.** Pages are on-demand SSG and Payload's `afterChange` hooks only
  fire on admin saves. After SQL, save one record of that collection in the admin, and expire the
  data cache with `POST /api/revalidate?secret=$REVALIDATE_SECRET&data=all`.

## Debugging production

- Use the Vercel connector (`get_runtime_errors`, `get_runtime_logs`). Team
  `team_VYexzbof58xnp4NKk975jDRy`, project `prj_EmyT9QAO8eMIB9FJwJioqXZwt1GZ`.
- A blank admin edit view or an empty page with a clean browser console usually means a
  server-side SQL error. The real message is only in the runtime log.
- Home-page sections missing while Supabase says "Healthy" means the pooler hit its 200-client
  limit. Search the logs for `EMAXCONN`.

## Golf rules: the society's records are right

Before "correcting" a result, a term or a figure, assume the record is right and find the rule
that explains it. Ask the user if you can't.

- **Playoff** means the society's tiebreak over holes 1, 2, 17 and 18. Never call it
  "countback". Exception: 2013 was a real four-hole playoff, played after a rain delay.
- **No-returns** (`noReturn` on a scorecard or a hole) count out of the Main and the Scratch only.
  Stableford scores the holes played, so a no-return can win it. Match play (nett) on the
  head-to-head page also keeps them. The Main champion can't also take the Stableford.
- **Championship week is three days:** practice round the day before, the championship (stored
  at noon), and corrections the day after. Compare whole days, never raw timestamps.
- Handicaps change from year to year, so different figures in different years aren't a mistake.

## Writing site copy

- **Alistair** Campbell (2013 champion), never "Alastair". Old image names and one article address
  keep the old spelling on purpose, so links don't break.
- John Pow is the oldest Champion Golfer outright, not joint-oldest. Kevin Park is second.
- Real logos, fonts and photos are fine. There's no fictional-only rule.

## Design

Matched to theopen.com one component at a time, at the user's pace. The measurements:
a 1366px container (`maxWidth.container`, theopen.com's gutters inside it), two splits only
(`main-side` 891 + 455 and `thirds` 442 × 3, held as fr ratios in `tailwind.config.ts`),
border-radius 0, and fixed type sizes. Vertical spacing deliberately stays as it is. The band
primitive is `src/components/shared/section-grid.tsx`.
