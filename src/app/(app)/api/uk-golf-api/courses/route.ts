import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { getUkGolfClubCourses } from "@/lib/uk-golf-api";

export async function GET(request: NextRequest) {
  const payload = await getPayload({ config: configPromise });
  const { user } = await payload.auth({ headers: request.headers });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const clubId = searchParams.get("clubId");
  if (!clubId) return NextResponse.json({ error: "clubId is required" }, { status: 400 });

  try {
    const courses = await getUkGolfClubCourses(clubId);
    return NextResponse.json({ courses });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Lookup failed" }, { status: 502 });
  }
}
