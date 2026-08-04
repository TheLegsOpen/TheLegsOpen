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
}

interface RawClubsResponse {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  clubs: { id: string; name: string; city?: string; county?: string; postcode?: string }[];
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
    .map((club) => ({ id: club.id, name: club.name, city: club.city, county: club.county, postcode: club.postcode }));
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

export interface UkGolfScorecard {
  courseId: string;
  courseName: string;
  teeSetName: string;
  courseRating?: number;
  slopeRating?: number;
  holes: UkGolfHole[];
}

interface RawScorecard {
  course_id: string;
  course_name: string;
  tee_set?: { name?: string; colour?: string; par?: number; course_rating?: number; slope_rating?: number };
  holes: { hole_number: number; par: number; stroke_index: number; yardage: number }[];
}

/**
 * Note: the API currently returns whichever tee it treats as the default for the course —
 * passing a specific tee_set_id doesn't change the result (verified against the real API).
 * The returned tee name/rating is surfaced so an admin can see exactly what they're importing.
 */
export async function getUkGolfScorecard(courseId: string): Promise<UkGolfScorecard> {
  const data = await ukGolfFetch<RawScorecard>(`/courses/${courseId}/scorecard`);
  return {
    courseId: data.course_id,
    courseName: data.course_name,
    teeSetName: [data.tee_set?.colour, data.tee_set?.name].filter(Boolean).join(" ") || "Unknown tee",
    courseRating: data.tee_set?.course_rating,
    slopeRating: data.tee_set?.slope_rating,
    holes: (data.holes ?? [])
      .map((hole) => ({ holeNumber: hole.hole_number, par: hole.par, strokeIndex: hole.stroke_index, yardage: hole.yardage }))
      .sort((a, b) => a.holeNumber - b.holeNumber),
  };
}
