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

async function probePayload(): Promise<ProbeResult> {
  const started = Date.now();
  try {
    const payload = await getPayload({ config });
    await payload.count({ collection: "players" });
    return { ok: true, ms: Date.now() - started };
  } catch (err) {
    const e = err as { message?: string; code?: string; cause?: { message?: string } };
    return { ok: false, ms: Date.now() - started, error: e.cause?.message ?? e.message, code: e.code };
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
  const poolMax1 = await probeRawPool(1);
  const poolMax5 = await probeRawPool(5);
  const payloadProbe = await probePayload();

  return NextResponse.json(
    { at, region: process.env.VERCEL_REGION ?? null, raw, poolMax1, poolMax5, payload: payloadProbe },
    { headers: { "cache-control": "no-store" } },
  );
}
