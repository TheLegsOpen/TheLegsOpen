const RAPIDAPI_HOST = "uk-golf-course-data-api.p.rapidapi.com";
const BASE_URL = `https://${RAPIDAPI_HOST}`;

/** GB home-nation codes this API's `country` filter accepts (3 letters, matches this project's own COUNTRIES codes). */
export type UkGolfCountryCode = "SCO" | "ENG" | "WAL" | "NIR";

function authHeaders(): HeadersInit {
  const key = process.env.UK_GOLF_API_KEY;
  if (!key) throw new Error("UK_GOLF_API_KEY is not set");
  return { "X-RapidAPI-Key": key, "X-RapidAPI-Host": RAPIDAPI_HOST };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Free tier is 5 requests/minute — if one still slips through, back off and retry rather than failing the whole search. */
async function ukGolfFetch<T>(path: string, retriesLeft = 2): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { headers: authHeaders(), cache: "no-store" });
  if (res.status === 429 && retriesLeft > 0) {
    const retryAfter = Number(res.headers.get("Retry-After"));
    await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 15_000);
    return ukGolfFetch<T>(path, retriesLeft - 1);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`UK Golf API request failed (${res.status}): ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export interface UkGolfClub {
  id: string;
  name: string;
  city?: string;
  county?: string;
  postcode?: string;
  latitude?: number;
  longitude?: number;
}

interface RawClubsResponse {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  clubs: { id: string; name: string; city?: string; county?: string; postcode?: string; latitude?: number; longitude?: number }[];
}

export interface UkGolfClubSearchPage {
  matches: UkGolfClub[];
  page: number;
  totalPages: number;
}

/**
 * The API's `/clubs` endpoint doesn't actually filter by name server-side (verified against the
 * real API — a `name` query param is silently ignored), so finding a club by name means paging
 * through every club for the country (max 50/page) and filtering here. The free tier's 5
 * requests/minute cap means fetching all ~9 pages for Scotland in one server request would risk
 * exceeding a serverless function's execution timeout — so this fetches ONE page per call, and the
 * caller (the admin UI) drives pagination itself, waiting between pages and showing matches as
 * they're found instead of blocking on the whole country at once.
 */
export async function searchUkGolfClubsPage(countryCode: UkGolfCountryCode, query: string, page: number): Promise<UkGolfClubSearchPage> {
  const needle = query.trim().toLowerCase();
  const data = await ukGolfFetch<RawClubsResponse>(`/clubs?country=${countryCode}&per_page=50&page=${page}`);
  const matches = data.clubs
    .filter((club) => club.name.toLowerCase().includes(needle))
    .map((club) => ({
      id: club.id,
      name: club.name,
      city: club.city,
      county: club.county,
      postcode: club.postcode,
      latitude: club.latitude,
      longitude: club.longitude,
    }));
  return { matches, page: data.page, totalPages: data.total_pages };
}

export interface UkGolfTeeSet {
  id: string;
  name: string;
  colour?: string;
  gender?: string;
  totalYardage?: number;
  par?: number;
  courseRating?: number;
  slopeRating?: number;
}

export interface UkGolfCourse {
  id: string;
  name: string;
  holes?: number;
  par?: number;
  teeSets: UkGolfTeeSet[];
}

interface RawCourse {
  id: string;
  name: string;
  holes?: number;
  par?: number;
  tee_sets?: {
    id: string;
    name: string;
    colour?: string;
    gender?: string;
    total_yardage?: number;
    par?: number;
    course_rating?: number;
    slope_rating?: number;
  }[];
}

export async function getUkGolfClubCourses(clubId: string): Promise<UkGolfCourse[]> {
  const data = await ukGolfFetch<RawCourse[]>(`/clubs/${clubId}/courses`);
  return data.map((course) => ({
    id: course.id,
    name: course.name,
    holes: course.holes,
    par: course.par,
    teeSets: (course.tee_sets ?? []).map((tee) => ({
      id: tee.id,
      name: tee.name,
      colour: tee.colour,
      gender: tee.gender,
      totalYardage: tee.total_yardage,
      par: tee.par,
      courseRating: tee.course_rating,
      slopeRating: tee.slope_rating,
    })),
  }));
}

export interface UkGolfHole {
  holeNumber: number;
  par: number;
  strokeIndex: number;
  yardage: number;
}

/** One playable tee, complete with the card you'd actually play off it. */
export interface UkGolfTeeCard {
  id: string;
  name: string;
  totalYardage?: number;
  par?: number;
  courseRating?: number;
  slopeRating?: number;
  holes: UkGolfHole[];
}

export interface UkGolfCourseDetail {
  courseId: string;
  courseName: string;
  clubName?: string;
  tees: UkGolfTeeCard[];
}

interface RawCourseDetail {
  id: string;
  name: string;
  club_name?: string;
  tee_sets?: {
    id: string;
    name?: string;
    colour?: string;
    total_yardage?: number;
    par?: number;
    course_rating?: number;
    slope_rating?: number;
    holes?: { hole_number: number; par: number; stroke_index: number; yardage: number }[];
  }[];
}

/**
 * Fetches a course with every tee set's full card, so the admin can choose which tee to import.
 *
 * This deliberately does NOT use /courses/{id}/scorecard, which is what the importer originally
 * called. That endpoint returns exactly one tee -- in practice the shortest -- and no parameter
 * changes it: tee_set_id, teeSetId, tee_set, tee, tee_colour and tee_name are all accepted and all
 * ignored, and /courses/{id}/tee-sets/{teeId}/scorecard, /tee-sets/{teeId}/holes and /holes all
 * 404. All verified against the live API on 2026-09-08 for Old Petty, where it kept returning the
 * Red tee (4,950 yards, slope 118) for a course played off White (6,580 yards, slope 135).
 *
 * /courses/{id} returns all of them at once, each with its own par/stroke index/yardage per hole,
 * which is both the fix and one request instead of several.
 *
 * Note that /clubs/{clubId}/courses lists tee sets too but without their holes, so this second call
 * is still needed once a course is picked.
 */
export async function getUkGolfCourseDetail(courseId: string): Promise<UkGolfCourseDetail> {
  const data = await ukGolfFetch<RawCourseDetail>(`/courses/${courseId}`);
  return {
    courseId: data.id,
    courseName: data.name,
    clubName: data.club_name,
    tees: (data.tee_sets ?? [])
      .map((tee) => ({
        id: tee.id,
        name: [tee.colour, tee.name].filter(Boolean).join(" ") || "Unnamed tee",
        totalYardage: tee.total_yardage,
        par: tee.par,
        courseRating: tee.course_rating,
        slopeRating: tee.slope_rating,
        holes: (tee.holes ?? [])
          .map((hole) => ({ holeNumber: hole.hole_number, par: hole.par, strokeIndex: hole.stroke_index, yardage: hole.yardage }))
          .sort((a, b) => a.holeNumber - b.holeNumber),
      }))
      // Longest first: the tee a competition is played off is far likelier to be near the top than
      // the forward tee the old scorecard endpoint kept handing back.
      .sort((a, b) => (b.totalYardage ?? 0) - (a.totalYardage ?? 0)),
  };
}
