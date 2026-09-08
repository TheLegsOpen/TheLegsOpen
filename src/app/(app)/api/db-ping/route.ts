import { NextRequest, NextResponse } from "next/server";
import { Client, Pool } from "pg";
import { getPayload } from "payload";

import config from "@/payload.config";

/**
 * TEMPORARY diagnostic route (2026-09-08) for the Supabase support ticket about connection
 * timeouts. Delete once that's resolved.
 *
 * Supabase support believes the timeouts are specific to how this app manages connections on the
 * /admin/login route. This route exists to test that claim from inside Vercel -- the same network,
 * the same DATABASE_URL, the same region -- by measuring two things independently:
 *
 *  - `raw`:     a brand-new standalone pg Client. No Payload, no shared pool, no app logic at all.
 *               Just connect + `select 1`. If this fails, the problem cannot be our connection
 *               management, because there isn't any.
 *  - `payload`: the app's actual Payload instance and its shared pool, running a trivial query.
 *               This is the path every real page (including /admin/login) uses.
 *
 * Comparing the two isolates "the network path from Vercel to the pooler is failing" from "our
 * pool is mismanaging connections". Timings are reported either way, since a slow-but-successful
 * handshake is itself the thing we suspect (see the connectionTimeoutMillis note in
 * payload.config.ts).
 *
 * Uses the same 20s connect timeout as the real pool so the comparison is apples-to-apples.
 */

const SECRET = "2015-lanark-9f3a7c1e-dbping";

export const dynamic = "force-dynamic";

interface ProbeResult {
  ok: boolean;
  ms: number;
  error?: string;
  code?: string;
}

async function probeRaw(): Promise<ProbeResult> {
  const started = Date.now();
  const client = new Client({
    connectionString: process.env.DATABASE_URL || "",
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20_000,
  });
  try {
    await client.connect();
    await client.query("select 1");
    return { ok: true, ms: Date.now() - started };
  } catch (err) {
    const e = err as { message?: string; code?: string };
    return { ok: false, ms: Date.now() - started, error: e.message, code: e.code };
  } finally {
    await client.end().catch(() => undefined);
  }
}

/**
 * Same connection string, but through a pg Pool instead of a bare Client, at a given `max`.
 * node-postgres throws the *identical* "timeout exceeded when trying to connect" message when a
 * caller waits longer than connectionTimeoutMillis for a free slot in the pool -- it is a queue
 * timeout, not a network one. Running max: 1 against max: 5 side by side distinguishes the two:
 * if 1 fails and 5 succeeds on the same connection string, the pool sizing is the fault, not
 * anything to do with Supabase.
 *
 * Two queries are issued concurrently on purpose -- that is what real pages do (Promise.all in
 * the layout and homepage), and it is the condition under which max: 1 can starve itself.
 */
async function probeRawPool(max: number): Promise<ProbeResult> {
  const started = Date.now();
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "",
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20_000,
    idleTimeoutMillis: 60_000,
    max,
  });
  try {
    await Promise.all([pool.query("select 1"), pool.query("select 2")]);
    return { ok: true, ms: Date.now() - started };
  } catch (err) {
    const e = err as { message?: string; code?: string };
    return { ok: false, ms: Date.now() - started, error: e.message, code: e.code };
  } finally {
    await pool.end().catch(() => undefined);
  }
}

/**
 * Same credentials and host, but port 6543 -- Supavisor's transaction-mode endpoint, as opposed to
 * session mode on 5432. Session mode gives each client its own backend connection for the whole
 * session, which caps us at pool_size (15) and is what produces EMAXCONNSESSION under real traffic:
 * frozen Vercel instances keep holding their connections, so they accumulate. Transaction mode
 * multiplexes instead, and the relevant ceiling becomes max client connections (200).
 *
 * Rewrites only the port, so no credential ever has to be handled outside the environment.
 * Reports the host/port in use (never the password) so we can confirm what is actually configured.
 */
function transactionPoolerUrl(): { url: string; from: string; to: string } | null {
  const raw = process.env.DATABASE_URL;
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const from = `${u.hostname}:${u.port || "5432"}`;
    u.port = "6543";
    return { url: u.toString(), from, to: `${u.hostname}:6543` };
  } catch {
    return null;
  }
}

async function probeTransactionPooler(): Promise<ProbeResult & { from?: string; to?: string }> {
  const target = transactionPoolerUrl();
  if (!target) return { ok: false, ms: 0, error: "DATABASE_URL unparseable" };

  const started = Date.now();
  const client = new Client({
    connectionString: target.url,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20_000,
  });
  try {
    await client.connect();
    await client.query("select 1");
    return { ok: true, ms: Date.now() - started, from: target.from, to: target.to };
  } catch (err) {
    const e = err as { message?: string; code?: string };
    return { ok: false, ms: Date.now() - started, error: e.message, code: e.code, from: target.from, to: target.to };
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function probePayload(): Promise<ProbeResult & { stats?: unknown }> {
  const started = Date.now();
  // node-postgres exposes live pool counters. If totalCount is at max while idleCount is 0 and
  // waitingCount keeps climbing, the pool has a client checked out that is never being released --
  // which produces exactly this "timeout exceeded when trying to connect" queue timeout, with no
  // network fault involved at all.
  const readStats = (p: unknown) => {
    const pool = (p as { db?: { pool?: { totalCount?: number; idleCount?: number; waitingCount?: number } } })?.db?.pool;
    if (!pool) return null;
    return { total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount };
  };

  let payload: Awaited<ReturnType<typeof getPayload>> | undefined;
  try {
    payload = await getPayload({ config });
    const before = readStats(payload);
    await payload.count({ collection: "players" });
    return { ok: true, ms: Date.now() - started, stats: { before, after: readStats(payload) } };
  } catch (err) {
    const e = err as { message?: string; code?: string; cause?: { message?: string } };
    return {
      ok: false,
      ms: Date.now() - started,
      error: e.cause?.message ?? e.message,
      code: e.code,
      stats: payload ? readStats(payload) : "payload init failed",
    };
  }
}

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get("secret") !== SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  const at = new Date().toISOString();
  // Sequential, not parallel -- running them at once would have them competing for the same
  // pooler slots, which is the very condition being measured.
  const raw = await probeRaw();
  const txPooler = await probeTransactionPooler();
  const payloadProbe = await probePayload();

  return NextResponse.json(
    { at, region: process.env.VERCEL_REGION ?? null, raw, txPooler, payload: payloadProbe },
    { headers: { "cache-control": "no-store" } },
  );
}
