import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";

import config from "@/payload.config";

/**
 * Temporary, secret-protected production route to sync a brand-new Payload Global's table into
 * Postgres. This project has no migration pipeline (no src/migrations, no `payload migrate` step
 * in the Vercel build) -- schema changes have always relied on Payload's dev-mode auto-push, which
 * is hard-gated to `NODE_ENV !== "production"` (see node_modules/@payloadcms/db-postgres/dist/connect.js)
 * and never runs on Vercel. Adding a field to an EXISTING table apparently never surfaced this
 * (or was pushed via some other path before this session), but adding a whole new Global
 * (globals/SEOSettings.ts -> table "seo_settings") hit it head-on: every page calling
 * getSeoSettings() failed to prerender with Postgres error 42P01, "relation does not exist".
 *
 * This re-implements the essential half of Payload's own pushDevSchema utility (see
 * node_modules/@payloadcms/drizzle/dist/utilities/pushDevSchema.js) rather than calling it
 * directly, specifically to avoid its interactive `prompts()` confirmation step -- that step calls
 * `process.exit(0)` on cancel, which would kill this whole serverless function if it ever
 * triggered. Since this route only ever *adds* a new table (never renames/drops a field), the
 * real pushSchema() call is expected to report zero warnings; if it doesn't, this aborts and
 * reports why instead of blindly applying a change that risks real data loss.
 *
 * Deleted once the seo-settings table exists in production (confirmed via a successful save on
 * the SEO global in the admin panel).
 */

const SCHEMA_PUSH_SECRET = "2015-lanark-9f3a7c1e-seo";

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (secret !== SCHEMA_PUSH_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  const payload = await getPayload({ config });
  // Postgres-adapter-internal properties (schema/drizzle/tablesFilter/schemaName,
  // requireDrizzleKit) aren't part of the public DatabaseAdapter type -- same cast Payload's own
  // connect.js implicitly relies on via `this` inside the adapter's own methods.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = payload.db as any;

  const { pushSchema } = adapter.requireDrizzleKit();
  const { apply, hasDataLoss, warnings } = await pushSchema(
    adapter.schema,
    adapter.drizzle,
    adapter.schemaName ? [adapter.schemaName] : undefined,
    adapter.tablesFilter,
  );

  if (warnings.length > 0 || hasDataLoss) {
    return NextResponse.json({ ok: false, appliedNothing: true, warnings, hasDataLoss }, { status: 409 });
  }

  await apply();
  return NextResponse.json({ ok: true });
}
