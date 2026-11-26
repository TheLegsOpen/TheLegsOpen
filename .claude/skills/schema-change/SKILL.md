---
name: schema-change
description: Write the hand-run Supabase SQL for a Payload schema change on The Legs Open (new field, collection, global, array, select or relationship), with the checklist of tables Payload expects. Use when a change to src/collections or src/globals adds or renames anything stored in the database.
disable-model-invocation: true
---

# Schema change: The Legs Open

The Legs Open has **no migrations**. `push: false` is set in `src/payload.config.ts`, and every
local or preview login is read-only. So a schema change is SQL that the user runs by hand in the
Supabase SQL editor **before** the deploy. Your job is to write that SQL and the checks for it.
You never run it yourself, because nothing here can write to production.

Change requested: $ARGUMENTS

## 1. Work out what Payload will expect

Read the changed config in `src/collections/` or `src/globals/`. Then list every table and column
it implies, using Payload's Postgres naming (snake_case):

| Config | Database |
|---|---|
| Plain field (text, number, checkbox, date…) | column on the parent table, e.g. `hero_caption varchar` |
| Single relationship / upload | `<field>_id integer` + FK (`ON DELETE SET NULL`) + index |
| `hasMany` relationship, or a polymorphic one | rows in `<table>_rels`, one `<collection>_id` column per target, with FK + index; create `<table>_rels` if it's missing |
| `group` | columns prefixed `<group>_<field>` on the parent table |
| `array` | child table `<table>_<array>` (`_order`, `_parent_id`, `id varchar PK`, fields) + order/parent indexes |
| `select` (single) | an enum type `enum_<table>_<field>` + column of that type |
| `select` with `hasMany` | child table `<table>_<field>` (`order`, `parent_id`, `value` enum, `id serial`) |
| Lexical rich-text **blocks** (inside the body) | **nothing**, because they're stored in the JSON |
| Layout `blocks` field (not rich text) | one table per block: `<table>_blocks_<slug>` |

When you're unsure of a name, copy the shape of an existing sibling. Ask the user to run
`select column_name, data_type from information_schema.columns where table_name = '<sibling>'`
in Supabase and paste the result. Don't guess.

## 2. The three traps (each has broken production before)

1. **Drafts mirror.** Articles is the only collection with `versions: { drafts: true }`. Every
   column, `_rels` table, array table and enum on `articles` needs a twin on `_articles_v`, with
   columns named `version_<column>`. A relationship keeps its `_id`, as in
   `version_championship_id`. An enum twin is named `enum__articles_v_version_<field>`
   (two underscores), as with the live `enum__articles_v_version_status`. If you miss one, the admin Articles list goes blank with no error.
   That happened on 2026-10-30 and went unnoticed for six days. Check the config for any other
   collection that has gained `drafts` since then.
2. **New collection → locks table.** Add a `<slug>_id integer` column, an FK to `<slug>(id)
   ON DELETE CASCADE` and an index on `payload_locked_documents_rels`. If you miss it, every
   *other* collection's record page renders empty. The full rule is in the comment above
   `collections` in `src/payload.config.ts`. Globals don't need this.
3. **New table → RLS and preview read.** Every table has row-level security on. For each new
   table: `ENABLE ROW LEVEL SECURITY`, then grant `legs_preview` SELECT and a `preview_read`
   policy, plus SELECT on any new `serial` sequence. If you skip this, the table reads empty in
   branch previews and in local dev.

## 3. Write the SQL

Save it as `photo-work/<short-name>.sql`. That folder is gitignored, and every past change lives
there, so `banners-and-menu.sql` and `article-tags.sql` are good models. The house style:

- A header comment that says in plain words what the change is, which config file it matches, and
  "Run once in the Supabase SQL editor before the deploy. Safe to run more than once."
- Make it **idempotent**: `ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`,
  `CREATE INDEX IF NOT EXISTS`, and wrap constraints and enum types in
  `DO $$ BEGIN … EXCEPTION WHEN duplicate_object THEN NULL; END $$;`.
- Double-quote identifiers. Use `timestamp(3) with time zone` for dates and `varchar` for text.
- When a new field replaces an old one or would otherwise show up empty, backfill it so the site
  looks the same as it does today. Only fill empty values (`WHERE … IS NULL`), and backfill the
  `_articles_v` twin as well.
- Wrap the preview grants in `IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'legs_preview')`.
- No `DROP` of anything holding data. If a field is removed, leave its column and say so.

## 4. Hand it over

Tell the user, in this order:

1. The file path, and a one-line summary of every table it touches.
2. **Run the SQL in Supabase before deploying.** If the code deploys first, the app queries columns
   that don't exist yet.
3. Checks to run afterwards:
   - `select column_name from information_schema.columns where table_name = '<table>'` for each
     table touched (including `_articles_v` or `payload_locked_documents_rels` where relevant).
   - Articles changes: `/api/articles?draft=true` should return 200. A 403 from
     `/api/articles/versions` is expected when signed out.
   - New collection: open an *existing* collection's record page (a player, say), not the new one.
   - If something renders empty, the real error is only in the Vercel runtime log
     (`npx vercel logs <deployment-url> --json`).
4. If the SQL **changed data**, not only the schema: SQL skips Payload's revalidate hooks. Either
   save one record of that collection in the admin or call
   `POST /api/revalidate?secret=$REVALIDATE_SECRET&data=all`. Never print the secret.

Don't commit, deploy or push as part of this skill. The user runs the SQL first.
