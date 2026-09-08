import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { getUkGolfCourseDetail } from "@/lib/uk-golf-api";

/**
 * Replaces the old /scorecard route, which could only ever return the one tee the API picked for
 * itself (see getUkGolfCourseDetail). This returns every tee with its own card so the admin chooses.
 */
export async function GET(request: NextRequest) {
  const payload = await getPayload({ config: configPromise });
  const { user } = await payload.auth({ headers: request.headers });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get("courseId");
  if (!courseId) return NextResponse.json({ error: "courseId is required" }, { status: 400 });

  try {
    const course = await getUkGolfCourseDetail(courseId);
    return NextResponse.json({ course });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Lookup failed" }, { status: 502 });
  }
}
