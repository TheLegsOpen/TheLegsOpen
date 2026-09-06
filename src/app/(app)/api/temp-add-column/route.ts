import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";

import config from "@/payload.config";

/**
 * Temporary, secret-protected, read-mostly route to add the missing "handicap_index" column to
 * the players table. Same root cause as the earlier seo_settings table: this project has no
 * migration pipeline, so a brand-new field on an existing Payload collection never gets its
 * column created in production Postgres. Confirmed via build error: "column players.handicap_index
 * does not exist" (Postgres 42703) when generating /players/[slug].
 *
 * Mirrors temp-schema-push's approach: introspects the real column type Payload already generated
 * for another plain "number" field on the same table (championship_handicap) via
 * information_schema, then issues a plain ALTER TABLE using that exact type -- no drizzle-kit
 * involved (it doesn't work in this Vercel serverless runtime, confirmed earlier tonight).
 * `?inspect=1` only reads that reference column (safe, no writes).
 *
 * Deleted once the column exists in production (confirmed via a successful save on a player's
 * Handicap Index field in the admin panel).
 */

const SECRET = "2015-lanark-9f3a7c1e-addcol";

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}

async function handle(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (secret !== SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  const payload = await getPayload({ config });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pool = (payload.db as any).pool;

  const referenceColumn = await pool.query(
    `select data_type, numeric_precision, numeric_scale
     from information_schema.columns
     where table_name = 'players' and column_name = 'championship_handicap'`,
  );

  if (request.nextUrl.searchParams.get("inspect") === "1") {
    return NextResponse.json({ referenceColumn: referenceColumn.rows });
  }

  const ref = referenceColumn.rows[0];
  if (!ref) {
    return NextResponse.json({ error: "Could not find reference column players.championship_handicap", referenceColumn: referenceColumn.rows }, { status: 500 });
  }

  const alreadyExists = await pool.query(
    `select column_name from information_schema.columns where table_name = 'players' and column_name = 'handicap_index'`,
  );
  if (alreadyExists.rows.length > 0) {
    return NextResponse.json({ ok: true, alreadyExisted: true });
  }

  const columnType =
    ref.data_type === "numeric" && ref.numeric_precision != null
      ? `numeric(${ref.numeric_precision}, ${ref.numeric_scale ?? 0})`
      : ref.data_type;

  const alterSql = `alter table "players" add column "handicap_index" ${columnType}`;
  await pool.query(alterSql);

  return NextResponse.json({ ok: true, alterSql });
}
