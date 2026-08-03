import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { slugify } from "@/lib/utils";

interface BulkPlayerRow {
  name: string;
  countryCode?: string;
  dateOfBirth?: string;
  championshipHandicap?: number;
  previousOpens?: number;
  turnedPro?: number;
  debutYear?: number;
  inField?: boolean;
  cdhNumber?: string;
}

interface RowResult {
  name: string;
  action: "created" | "updated" | "error";
  error?: string;
}

export async function POST(request: NextRequest) {
  const payload = await getPayload({ config: configPromise });
  const { user } = await payload.auth({ headers: request.headers });

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { players?: BulkPlayerRow[] };
  const rows = body.players ?? [];

  const results: RowResult[] = [];

  for (const row of rows) {
    if (!row.name?.trim()) {
      results.push({ name: row.name ?? "(blank)", action: "error", error: "Missing name" });
      continue;
    }

    const slug = slugify(row.name);
    const data: Record<string, unknown> = {
      name: row.name.trim(),
      countryCode: row.countryCode || "SCO",
    };
    if (row.dateOfBirth) data.dateOfBirth = row.dateOfBirth;
    if (row.championshipHandicap !== undefined) data.championshipHandicap = row.championshipHandicap;
    if (row.previousOpens !== undefined) data.previousOpens = row.previousOpens;
    if (row.turnedPro !== undefined) data.turnedPro = row.turnedPro;
    if (row.debutYear !== undefined) data.debutYear = row.debutYear;
    if (row.inField !== undefined) data.inField = row.inField;
    if (row.cdhNumber) data.cdhNumber = row.cdhNumber;

    try {
      const existing = await payload.find({ collection: "players", where: { slug: { equals: slug } }, limit: 1 });
      if (existing.docs[0]) {
        await payload.update({ collection: "players", id: existing.docs[0].id, data });
        results.push({ name: row.name, action: "updated" });
      } else {
        await payload.create({ collection: "players", data: data as never });
        results.push({ name: row.name, action: "created" });
      }
    } catch (err) {
      results.push({ name: row.name, action: "error", error: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  const summary = {
    created: results.filter((r) => r.action === "created").length,
    updated: results.filter((r) => r.action === "updated").length,
    errors: results.filter((r) => r.action === "error").length,
  };

  return NextResponse.json({ success: true, summary, results });
}
