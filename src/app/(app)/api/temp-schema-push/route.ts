import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";

import config from "@/payload.config";

/**
 * Temporary, secret-protected production route to create the missing seo_settings table in
 * Postgres. This project has no migration pipeline -- schema changes have always relied on
 * Payload's dev-mode auto-push, which is hard-gated to `NODE_ENV !== "production"` and never runs
 * on Vercel. Adding a whole new Global (globals/SEOSettings.ts -> table "seo_settings") hit that
 * head-on: every page calling getSeoSettings() failed with Postgres 42P01, "relation does not
 * exist".
 *
 * First attempt called Payload's own pushDevSchema/pushSchema (drizzle-kit) directly -- that
 * failed at runtime in the Vercel serverless function with "Failed to load external module
 * drizzle-kit-...", since drizzle-kit is a transitive dev-only dependency that isn't reliably
 * traced into the function bundle. This version sidesteps drizzle-kit entirely: it introspects the
 * REAL column types Payload already generated for an existing, structurally-identical global
 * (contact_page -- same plain text/textarea fields) via information_schema, then issues a plain
 * CREATE TABLE using those exact types, rather than guessing Postgres/Drizzle's own type mapping.
 * `?inspect=1` only reads that reference schema (safe, no writes) so the exact column types can be
 * confirmed before the CREATE TABLE ever runs.
 *
 * Deleted once the seo-settings table exists in production (confirmed via a successful save on
 * the SEO global in the admin panel).
 */

const SCHEMA_PUSH_SECRET = "2015-lanark-9f3a7c1e-seo";

// Every SEOSettings field is a plain "text" or "textarea" -- mirrors globals/SEOSettings.ts field order.
const TEXT_COLUMNS = [
  "home_title",
  "leaderboard_title",
  "tee_times_title",
  "records_title",
  "statistics_title",
  "field_title",
  "venues_title",
  "live_blog_title",
  "latest_title",
  "previous_opens_title",
  "club_title",
  "patrons_title",
  "careers_title",
  "media_title",
  "contact_title",
];
const TEXTAREA_COLUMNS = [
  "home_description",
  "leaderboard_description",
  "tee_times_description",
  "records_description",
  "statistics_description",
  "field_description",
  "venues_description",
  "live_blog_description",
  "latest_description",
  "previous_opens_description",
  "club_description",
  "patrons_description",
  "careers_description",
  "media_description",
  "contact_description",
];

export async function GET(request: NextRequest) {
  return handleSchemaPush(request);
}

export async function POST(request: NextRequest) {
  return handleSchemaPush(request);
}

async function handleSchemaPush(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (secret !== SCHEMA_PUSH_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  const payload = await getPayload({ config });
  // .pool is a plain node-postgres Pool -- not part of the public DatabaseAdapter type, same as
  // every other Postgres-adapter-internal property this project's temp routes have relied on.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pool = (payload.db as any).pool;

  const referenceColumns = await pool.query(
    `select column_name, data_type, is_nullable
     from information_schema.columns
     where table_name = 'contact_page'
     order by ordinal_position`,
  );

  if (request.nextUrl.searchParams.get("inspect") === "1") {
    return NextResponse.json({ referenceColumns: referenceColumns.rows });
  }

  const textType = referenceColumns.rows.find((r: { column_name: string }) => r.column_name === "hero_title")?.data_type;
  const textareaType = referenceColumns.rows.find((r: { column_name: string }) => r.column_name === "hero_description")?.data_type;
  const idType = referenceColumns.rows.find((r: { column_name: string }) => r.column_name === "id")?.data_type;
  const timestampType = referenceColumns.rows.find((r: { column_name: string }) => r.column_name === "updated_at")?.data_type;

  if (!textType || !textareaType || !idType || !timestampType) {
    return NextResponse.json({ error: "Could not determine reference column types from contact_page", referenceColumns: referenceColumns.rows }, { status: 500 });
  }

  const alreadyExists = await pool.query(`select to_regclass('public.seo_settings') as exists`);
  if (alreadyExists.rows[0]?.exists) {
    return NextResponse.json({ ok: true, alreadyExisted: true });
  }

  const idSql = idType === "integer" ? "serial" : idType;
  const columnDefs = [
    ...TEXT_COLUMNS.map((c) => `"${c}" ${textType}`),
    ...TEXTAREA_COLUMNS.map((c) => `"${c}" ${textareaType}`),
    `"updated_at" ${timestampType}`,
    `"created_at" ${timestampType}`,
  ].join(",\n  ");

  const createSql = `create table "seo_settings" (\n  "id" ${idSql} primary key,\n  ${columnDefs}\n)`;

  await pool.query(createSql);

  return NextResponse.json({ ok: true, createSql });
}
