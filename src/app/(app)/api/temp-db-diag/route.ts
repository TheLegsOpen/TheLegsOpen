import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";

import config from "@/payload.config";

/**
 * Temporary, secret-protected, READ-ONLY diagnostic route for the recurring "EMAXCONN" /
 * connection-pool-exhaustion errors seen repeatedly tonight (a build timing out generating
 * /players/[slug] pages, several player pages briefly failing, etc.). Reports Postgres's own
 * max_connections limit, how many connections are currently open, and a breakdown by
 * application_name/state/client address -- so the fix (raise Supabase's pooler limit, cap this
 * app's own pool size, or switch DATABASE_URL to the pooler endpoint) can be chosen from real
 * numbers instead of guessing. No writes. Deleted once the real cause is confirmed.
 */

const DIAG_SECRET = "2015-lanark-9f3a7c1e-diag";

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (secret !== DIAG_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  const payload = await getPayload({ config });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pool = (payload.db as any).pool;

  const maxConn = await pool.query(`select current_setting('max_connections') as max_connections`);
  const totalConn = await pool.query(`select count(*) as total from pg_stat_activity`);
  const byState = await pool.query(
    `select state, count(*) as count from pg_stat_activity group by state order by count desc`,
  );
  const byApp = await pool.query(
    `select application_name, count(*) as count from pg_stat_activity group by application_name order by count desc limit 20`,
  );
  const serverPort = await pool.query(`select inet_server_port() as port`);

  return NextResponse.json({
    maxConnections: maxConn.rows[0],
    totalConnections: totalConn.rows[0],
    byState: byState.rows,
    byApplication: byApp.rows,
    serverPort: serverPort.rows[0],
    thisPoolMax: pool.options?.max ?? "default (10)",
  });
}
