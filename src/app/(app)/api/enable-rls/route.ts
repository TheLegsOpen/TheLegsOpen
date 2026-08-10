import { NextResponse } from "next/server";
import { getPayload } from "payload";

import configPromise from "@/payload.config";

export async function GET() {
  const payload = await getPayload({ config: configPromise });
  const pool = (payload.db as unknown as { pool: import("pg").Pool }).pool;

  const { rows } = await pool.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false ORDER BY tablename`,
  );

  const enabled: string[] = [];
  for (const { tablename } of rows) {
    await pool.query(`ALTER TABLE "public"."${tablename}" ENABLE ROW LEVEL SECURITY`);
    enabled.push(tablename);
  }

  return NextResponse.json({ enabledCount: enabled.length, enabled });
}
