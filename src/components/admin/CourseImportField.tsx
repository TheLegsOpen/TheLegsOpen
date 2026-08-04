"use client";

import React, { useRef, useState } from "react";
import { useField, useForm } from "@payloadcms/ui";
import type { UIFieldClientComponent } from "payload";

interface ClubResult {
  id: string;
  name: string;
  city?: string;
  county?: string;
  postcode?: string;
}

interface CourseResult {
  id: string;
  name: string;
  holes?: number;
  par?: number;
  teeSets: { id: string; name: string; totalYardage?: number; par?: number }[];
}

interface ScorecardResult {
  courseId: string;
  courseName: string;
  teeSetName: string;
  courseRating?: number;
  slopeRating?: number;
  holes: { holeNumber: number; par: number; strokeIndex: number; yardage: number }[];
}

const COUNTRY_OPTIONS: { label: string; value: string }[] = [
  { label: "Scotland", value: "SCO" },
  { label: "England", value: "ENG" },
  { label: "Wales", value: "WAL" },
  { label: "Northern Ireland", value: "NIR" },
];

const panelStyle: React.CSSProperties = {
  border: "1px solid var(--theme-elevation-150)",
  borderRadius: 4,
  padding: 16,
  marginBottom: 16,
  background: "var(--theme-elevation-50)",
};

const buttonStyle: React.CSSProperties = {
  padding: "6px 14px",
  fontSize: 13,
  fontWeight: 600,
  border: "1px solid var(--theme-elevation-150)",
  borderRadius: 4,
  background: "var(--theme-input-bg)",
  cursor: "pointer",
};

const listItemStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "8px 10px",
  border: "1px solid var(--theme-elevation-150)",
  borderRadius: 4,
  marginBottom: 6,
  cursor: "pointer",
  fontSize: 13,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const CourseImportField: UIFieldClientComponent = () => {
  const [open, setOpen] = useState(false);
  const [country, setCountry] = useState("SCO");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [clubs, setClubs] = useState<ClubResult[] | null>(null);
  const [courses, setCourses] = useState<CourseResult[] | null>(null);
  const [scorecard, setScorecard] = useState<ScorecardResult | null>(null);
  const [imported, setImported] = useState(false);
  const [searchProgress, setSearchProgress] = useState<{ page: number; totalPages: number } | null>(null);
  const stopRequested = useRef(false);

  const { dispatchFields, addFieldRow } = useForm();
  const { rows: holeRows = [] } = useField<unknown[]>({ path: "holes", hasRows: true });

  async function callApi<T>(url: string): Promise<T> {
    const res = await fetch(url);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Request failed");
    return json;
  }

  async function handleSearch() {
    if (query.trim().length < 3) {
      setErrorMessage("Type at least 3 characters.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setErrorMessage("");
    setCourses(null);
    setScorecard(null);
    setClubs([]);
    stopRequested.current = false;

    const trimmedQuery = encodeURIComponent(query.trim());
    let page = 1;
    let totalPages = 1;

    try {
      do {
        setSearchProgress({ page, totalPages });
        const result = await callApi<{ matches: ClubResult[]; page: number; totalPages: number }>(
          `/api/uk-golf-api/clubs?country=${country}&q=${trimmedQuery}&page=${page}`,
        );
        totalPages = result.totalPages;
        if (result.matches.length > 0) {
          setClubs((prev) => [...(prev ?? []), ...result.matches]);
        }
        page += 1;
        // Free tier is 5 requests/minute — space page fetches out to stay under that. The admin
        // can pick a club (and stop the search) as soon as it appears, without waiting for the rest.
        if (page <= totalPages && !stopRequested.current) await sleep(13_000);
      } while (page <= totalPages && !stopRequested.current);
      setStatus("idle");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Search failed");
      setStatus("error");
    } finally {
      setSearchProgress(null);
    }
  }

  async function handlePickClub(club: ClubResult) {
    setStatus("loading");
    setErrorMessage("");
    setClubs(null);
    setScorecard(null);
    try {
      const { courses: results } = await callApi<{ courses: CourseResult[] }>(`/api/uk-golf-api/courses?clubId=${club.id}`);
      setCourses(results);
      setStatus("idle");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Lookup failed");
      setStatus("error");
    }
  }

  async function handlePickCourse(course: CourseResult) {
    setStatus("loading");
    setErrorMessage("");
    setCourses(null);
    try {
      const { scorecard: result } = await callApi<{ scorecard: ScorecardResult }>(`/api/uk-golf-api/scorecard?courseId=${course.id}`);
      if (result.holes.length !== 18) {
        throw new Error(`This course only has ${result.holes.length} holes of scorecard data on file — expected 18.`);
      }
      setScorecard(result);
      setStatus("idle");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Lookup failed");
      setStatus("error");
    }
  }

  function handleImport() {
    if (!scorecard) return;

    for (let i = holeRows.length; i < 18; i++) {
      addFieldRow({ path: "holes", rowIndex: i, schemaPath: "holes" });
    }

    scorecard.holes.forEach((hole, i) => {
      dispatchFields({ type: "UPDATE", path: `holes.${i}.par`, value: hole.par });
      dispatchFields({ type: "UPDATE", path: `holes.${i}.yards`, value: hole.yardage });
      dispatchFields({ type: "UPDATE", path: `holes.${i}.si`, value: hole.strokeIndex });
    });
    if (scorecard.courseRating !== undefined) {
      dispatchFields({ type: "UPDATE", path: "courseRating", value: scorecard.courseRating });
    }
    if (scorecard.slopeRating !== undefined) {
      dispatchFields({ type: "UPDATE", path: "slopeRating", value: scorecard.slopeRating });
    }

    setImported(true);
    setScorecard(null);
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} style={{ ...buttonStyle, marginBottom: 16 }}>
        Import course from UK Golf API
      </button>
    );
  }

  return (
    <div style={panelStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <strong style={{ fontSize: 14 }}>Import course from UK Golf API</strong>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setClubs(null);
            setCourses(null);
            setScorecard(null);
            setErrorMessage("");
          }}
          style={{ ...buttonStyle, padding: "2px 8px" }}
        >
          Close
        </button>
      </div>

      {imported ? (
        <p style={{ fontSize: 13, color: "var(--theme-success-500)", marginBottom: 12 }}>
          Imported — review the Hole Setup table below (and course rating/slope above it), then save.
        </p>
      ) : null}

      {!clubs && !courses && !scorecard ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select value={country} onChange={(e) => setCountry(e.target.value)} style={{ ...buttonStyle, cursor: "pointer" }}>
            {COUNTRY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Club name, e.g. Blairgowrie"
            style={{ ...buttonStyle, cursor: "text", flex: 1, minWidth: 200 }}
          />
          <button type="button" onClick={handleSearch} disabled={status === "loading"} style={buttonStyle}>
            Search
          </button>
          <p style={{ fontSize: 12, color: "var(--theme-elevation-500)", width: "100%", margin: 0 }}>
            Searches every club in the selected country, page by page (the free API tier limits this to one page every ~13
            seconds) — matches appear as they're found, and you can pick one or stop early rather than waiting for the whole
            country. A full pass over Scotland takes a couple of minutes if you let it run to the end.
          </p>
        </div>
      ) : null}

      {clubs ? (
        <div>
          {searchProgress ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: "var(--theme-elevation-500)" }}>
                Searching page {searchProgress.page} of {searchProgress.totalPages || "?"}
                {clubs.length > 0 ? ` — ${clubs.length} found so far` : ""}…
              </span>
              <button
                type="button"
                onClick={() => {
                  stopRequested.current = true;
                }}
                style={{ ...buttonStyle, padding: "2px 8px" }}
              >
                Stop searching
              </button>
            </div>
          ) : null}
          {!searchProgress && clubs.length === 0 ? <p style={{ fontSize: 13 }}>No clubs matched. Try a shorter or different name.</p> : null}
          {clubs.map((club) => (
            <div key={club.id} style={listItemStyle} onClick={() => handlePickClub(club)}>
              <span>
                <strong>{club.name}</strong>
                {club.city ? ` — ${club.city}` : ""}
                {club.postcode ? ` (${club.postcode})` : ""}
              </span>
              <span style={{ color: "var(--theme-elevation-500)" }}>Select →</span>
            </div>
          ))}
          {!searchProgress ? (
            <button type="button" onClick={() => setClubs(null)} style={{ ...buttonStyle, marginTop: 4 }}>
              ← New search
            </button>
          ) : null}
        </div>
      ) : null}

      {courses ? (
        <div>
          {courses.length === 0 ? <p style={{ fontSize: 13 }}>This club has no course data on file in the API.</p> : null}
          {courses.map((course) => (
            <div key={course.id} style={listItemStyle} onClick={() => handlePickCourse(course)}>
              <span>
                <strong>{course.name}</strong>
                {course.par ? ` — Par ${course.par}` : ""}
                {course.teeSets.length > 0 ? ` (${course.teeSets.length} tee${course.teeSets.length === 1 ? "" : "s"} on file)` : ""}
              </span>
              <span style={{ color: "var(--theme-elevation-500)" }}>Select →</span>
            </div>
          ))}
          <button type="button" onClick={() => setCourses(null)} style={{ ...buttonStyle, marginTop: 4 }}>
            ← Back to clubs
          </button>
        </div>
      ) : null}

      {scorecard ? (
        <div>
          <p style={{ fontSize: 13, marginBottom: 8 }}>
            <strong>{scorecard.courseName}</strong> — {scorecard.teeSetName} tee
            {scorecard.courseRating ? `, rating ${scorecard.courseRating}` : ""}
            {scorecard.slopeRating ? `, slope ${scorecard.slopeRating}` : ""}
          </p>
          <p style={{ fontSize: 12, color: "var(--theme-elevation-500)", marginBottom: 8 }}>
            This is whichever tee the API returns as default for this course — it may not be your usual competition tee. Check the
            yardages below look right before importing.
          </p>
          <div style={{ overflowX: "auto", marginBottom: 12 }}>
            <table style={{ borderCollapse: "collapse", fontSize: 12, width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ padding: 4, textAlign: "left" }}>Hole</th>
                  {scorecard.holes.map((h) => (
                    <th key={h.holeNumber} style={{ padding: 4 }}>
                      {h.holeNumber}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: 4, fontWeight: 600 }}>Par</td>
                  {scorecard.holes.map((h) => (
                    <td key={h.holeNumber} style={{ padding: 4, textAlign: "center" }}>
                      {h.par}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td style={{ padding: 4, fontWeight: 600 }}>Yards</td>
                  {scorecard.holes.map((h) => (
                    <td key={h.holeNumber} style={{ padding: 4, textAlign: "center" }}>
                      {h.yardage}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td style={{ padding: 4, fontWeight: 600 }}>SI</td>
                  {scorecard.holes.map((h) => (
                    <td key={h.holeNumber} style={{ padding: 4, textAlign: "center" }}>
                      {h.strokeIndex}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={handleImport} style={{ ...buttonStyle, background: "var(--theme-success-500)", color: "white" }}>
              Use this data
            </button>
            <button type="button" onClick={() => setScorecard(null)} style={buttonStyle}>
              ← Back
            </button>
          </div>
        </div>
      ) : null}

      {errorMessage ? <p style={{ fontSize: 13, color: "var(--theme-error-500)", marginTop: 8 }}>{errorMessage}</p> : null}
    </div>
  );
};
