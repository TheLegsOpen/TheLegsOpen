import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";

import config from "@/payload.config";

/**
 * Temporary, secret-protected route to add every column the practice-round feature needs to
 * production Postgres in one pass. Same root cause as the earlier seo_settings table and
 * handicap_index: this project has no migration pipeline, so a brand-new field on an existing
 * Payload collection never gets its column created in production. Mirrors that route's approach:
 * introspects the real column type Payload already generated for a comparable existing field via
 * information_schema, then issues a plain ALTER TABLE using that exact type -- no drizzle-kit
 * involved (it doesn't work in this Vercel serverless runtime, confirmed earlier).
 *
 * Covers, in order:
 *  - players.handicap_index, players.practice_handicap (number, cloned from players.championship_handicap)
 *  - venues.is_practice (boolean, cloned from players.in_field)
 *  - tee_time_rounds.venue_id (relationship, cloned from tee_time_rounds.championship_id)
 *  - scorecards.tee_time_round_id (relationship, cloned from tee_time_rounds.championship_id)
 *  - scorecards.championship_id dropped NOT NULL (a practice-round scorecard has no championship)
 *
 * `?inspect=1` only reads the reference columns' types and reports the planned ALTER statements --
 * no writes. Without it, runs every step that hasn't already been applied (each is checked and
 * skipped individually, so this is safe to call more than once).
 *
 * Delete this route once every step has run successfully (confirmed via a successful save of a
 * player's Handicap Index, a venue's Practice Course checkbox, and a Tee Time Round's Course field
 * in the admin panel).
 */

const SECRET = "2015-lanark-9f3a7c1e-addcol";

interface ColumnSpec {
  table: string;
  column: string;
  referenceTable: string;
  referenceColumn: string;
}

const PENDING_COLUMNS: ColumnSpec[] = [
  { table: "players", column: "handicap_index", referenceTable: "players", referenceColumn: "championship_handicap" },
  { table: "players", column: "practice_handicap", referenceTable: "players", referenceColumn: "championship_handicap" },
  { table: "venues", column: "is_practice", referenceTable: "players", referenceColumn: "in_field" },
  { table: "tee_time_rounds", column: "venue_id", referenceTable: "tee_time_rounds", referenceColumn: "championship_id" },
  { table: "scorecards", column: "tee_time_round_id", referenceTable: "tee_time_rounds", referenceColumn: "championship_id" },
];

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
  const pool = (payload.db as unknown as { pool: { query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> } }).pool;
  const inspectOnly = request.nextUrl.searchParams.get("inspect") === "1";

  const results: Record<string, unknown>[] = [];

  for (const spec of PENDING_COLUMNS) {
    const alreadyExists = await pool.query(
      `select column_name from information_schema.columns where table_name = $1 and column_name = $2`,
      [spec.table, spec.column],
    );
    if (alreadyExists.rows.length > 0) {
      results.push({ ...spec, status: "already exists" });
      continue;
    }

    const reference = await pool.query(
      `select data_type, numeric_precision, numeric_scale
       from information_schema.columns
       where table_name = $1 and column_name = $2`,
      [spec.referenceTable, spec.referenceColumn],
    );
    const ref = reference.rows[0];
    if (!ref) {
      results.push({ ...spec, status: "error", error: `Could not find reference column ${spec.referenceTable}.${spec.referenceColumn}` });
      continue;
    }

    const columnType =
      ref.data_type === "numeric" && ref.numeric_precision != null
        ? `numeric(${ref.numeric_precision}, ${ref.numeric_scale ?? 0})`
        : ref.data_type;
    const alterSql = `alter table "${spec.table}" add column "${spec.column}" ${columnType}`;

    if (inspectOnly) {
      results.push({ ...spec, status: "planned", alterSql });
      continue;
    }

    await pool.query(alterSql);
    results.push({ ...spec, status: "added", alterSql });
  }

  // scorecards.championship_id is now optional (a practice-round card has no championship) --
  // loosening NOT NULL is safe/backwards-compatible regardless of how many rows already exist.
  const nnCheck = await pool.query(
    `select is_nullable from information_schema.columns where table_name = 'scorecards' and column_name = 'championship_id'`,
  );
  if (nnCheck.rows[0]?.is_nullable === "NO") {
    const dropNotNullSql = `alter table "scorecards" alter column "championship_id" drop not null`;
    if (inspectOnly) {
      results.push({ table: "scorecards", column: "championship_id", status: "planned", alterSql: dropNotNullSql });
    } else {
      await pool.query(dropNotNullSql);
      results.push({ table: "scorecards", column: "championship_id", status: "dropped not null", alterSql: dropNotNullSql });
    }
  } else {
    results.push({ table: "scorecards", column: "championship_id", status: "already nullable" });
  }

  return NextResponse.json({ ok: true, inspectOnly, results });
}
