import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { searchUkGolfClubsPage, type UkGolfCountryCode } from "@/lib/uk-golf-api";

const VALID_COUNTRIES: UkGolfCountryCode[] = ["SCO", "ENG", "WAL", "NIR"];

export async function GET(request: NextRequest) {
  const payload = await getPayload({ config: configPromise });
  const { user } = await payload.auth({ headers: request.headers });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country") as UkGolfCountryCode | null;
  const query = searchParams.get("q") ?? "";
  const page = Number(searchParams.get("page") ?? "1");

  if (!country || !VALID_COUNTRIES.includes(country)) {
    return NextResponse.json({ error: "country must be one of SCO, ENG, WAL, NIR" }, { status: 400 });
  }
  if (query.trim().length < 3) {
    return NextResponse.json({ error: "Search for at least 3 characters" }, { status: 400 });
  }
  if (!Number.isInteger(page) || page < 1) {
    return NextResponse.json({ error: "page must be a positive integer" }, { status: 400 });
  }

  try {
    const result = await searchUkGolfClubsPage(country, query, page);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Search failed" }, { status: 502 });
  }
}
