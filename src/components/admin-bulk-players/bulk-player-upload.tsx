"use client";

import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import { COUNTRIES } from "@/data/countries";

const COLUMNS = [
  "name",
  "countryCode",
  "dateOfBirth",
  "championshipHandicap",
  "previousOpens",
  "turnedPro",
  "debutYear",
  "inField",
  "cdhNumber",
] as const;

const TEMPLATE = `name,countryCode,dateOfBirth,championshipHandicap,previousOpens,turnedPro,debutYear,inField,cdhNumber
John Pow,SCO,29/04/1979,13,2,,,true,
David Clee,SCO,29/08/1981,17,0,,,true,`;

const VALID_COUNTRY_CODES = new Set(COUNTRIES.map((c) => c.code));

interface ParsedRow {
  raw: Record<string, string>;
  name: string;
  countryCode?: string;
  dateOfBirth?: string;
  championshipHandicap?: number;
  previousOpens?: number;
  turnedPro?: number;
  debutYear?: number;
  inField?: boolean;
  cdhNumber?: string;
  errors: string[];
}

function detectDelimiter(firstLine: string): string {
  return firstLine.includes("\t") ? "\t" : ",";
}

/** Handles simple CSV/TSV — quoted fields with embedded delimiters or commas, no embedded newlines. */
function splitLine(line: string, delimiter: string): string[] {
  if (delimiter === "\t") return line.split("\t").map((cell) => cell.trim());
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

/** DD/MM/YYYY (site convention) -> ISO date string, or undefined if unparsable. */
function parseUkDate(value: string): string | undefined {
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return undefined;
  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function parseBoolean(value: string): boolean {
  return ["true", "yes", "1", "y"].includes(value.trim().toLowerCase());
}

function parseRows(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const delimiter = detectDelimiter(lines[0]);
  const header = splitLine(lines[0], delimiter).map((h) => h.toLowerCase());

  return lines.slice(1).map((line) => {
    const cells = splitLine(line, delimiter);
    const raw: Record<string, string> = {};
    header.forEach((key, i) => {
      raw[key] = cells[i] ?? "";
    });

    const errors: string[] = [];
    const name = raw.name?.trim() ?? "";
    if (!name) errors.push("Missing name");

    const countryCode = raw.countrycode?.trim().toUpperCase() || undefined;
    if (countryCode && !VALID_COUNTRY_CODES.has(countryCode)) {
      errors.push(`Unknown country code "${countryCode}" (defaults to SCO if left blank)`);
    }

    let dateOfBirth: string | undefined;
    if (raw.dateofbirth?.trim()) {
      dateOfBirth = parseUkDate(raw.dateofbirth.trim());
      if (!dateOfBirth) errors.push(`Unparsable date of birth "${raw.dateofbirth}" (use DD/MM/YYYY)`);
    }

    const numberField = (key: string): number | undefined => {
      const value = raw[key]?.trim();
      if (!value) return undefined;
      const parsed = Number(value);
      if (Number.isNaN(parsed)) {
        errors.push(`"${key}" isn't a number: "${value}"`);
        return undefined;
      }
      return parsed;
    };

    return {
      raw,
      name,
      countryCode,
      dateOfBirth,
      championshipHandicap: numberField("championshiphandicap"),
      previousOpens: numberField("previousopens"),
      turnedPro: numberField("turnedpro"),
      debutYear: numberField("debutyear"),
      inField: raw.infield?.trim() ? parseBoolean(raw.infield) : undefined,
      cdhNumber: raw.cdhnumber?.trim() || undefined,
      errors,
    };
  });
}

type SubmitStatus = "idle" | "submitting" | "done" | "error";

export function BulkPlayerUpload() {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [summary, setSummary] = useState<{ created: number; updated: number; errors: number } | null>(null);
  const [rowErrors, setRowErrors] = useState<{ name: string; error?: string }[]>([]);

  const rows = useMemo(() => parseRows(text), [text]);
  const validRows = rows.filter((r) => r.errors.length === 0);
  const invalidRows = rows.filter((r) => r.errors.length > 0);

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "players-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleSubmit() {
    setStatus("submitting");
    setSummary(null);
    setRowErrors([]);
    try {
      const res = await fetch("/api/admin-bulk-players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          players: validRows.map((r) => ({
            name: r.name,
            countryCode: r.countryCode,
            dateOfBirth: r.dateOfBirth,
            championshipHandicap: r.championshipHandicap,
            previousOpens: r.previousOpens,
            turnedPro: r.turnedPro,
            debutYear: r.debutYear,
            inField: r.inField,
            cdhNumber: r.cdhNumber,
          })),
        }),
      });
      if (!res.ok) throw new Error("Upload failed");
      const json = (await res.json()) as {
        summary: { created: number; updated: number; errors: number };
        results: { name: string; action: string; error?: string }[];
      };
      setSummary(json.summary);
      setRowErrors(json.results.filter((r) => r.action === "error"));
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-surface-dark-foreground/70">
          Paste rows copied from a spreadsheet, or CSV text, below. The first row must be a header matching these columns (order
          doesn&apos;t matter, and every column except <span className="font-mono">name</span> is optional):
        </p>
        <code className="block overflow-x-auto border border-surface-dark-foreground/15 bg-surface-dark-foreground/5 p-3 text-xs">
          {COLUMNS.join(", ")}
        </code>
        <p className="text-xs text-surface-dark-foreground/50">
          Dates are DD/MM/YYYY. countryCode defaults to SCO if left blank. Matches existing players by name to update them instead of
          creating duplicates. Photos, bios and galleries aren&apos;t supported here — add those individually in Admin afterwards.
        </p>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setText(TEMPLATE)}
            className="w-fit text-xs font-bold uppercase tracking-wide text-accent hover:underline"
          >
            Fill in an example template
          </button>
          <button type="button" onClick={downloadTemplate} className="w-fit text-xs font-bold uppercase tracking-wide text-accent hover:underline">
            Download CSV template
          </button>
        </div>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        placeholder="name,countryCode,dateOfBirth,championshipHandicap,previousOpens,turnedPro,debutYear,inField,cdhNumber"
        className="w-full border border-surface-dark-foreground/20 bg-surface-dark-foreground/5 p-3 font-mono text-sm text-surface-dark-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      />

      {rows.length > 0 ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-surface-dark-foreground/70">
            {validRows.length} ready to upload{invalidRows.length > 0 ? `, ${invalidRows.length} with problems` : ""}.
          </p>
          <div className="overflow-x-auto border border-surface-dark-foreground/15">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-surface-dark-foreground/15 bg-surface-dark-foreground/5 text-left text-xs uppercase tracking-wide text-surface-dark-foreground/60">
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Country</th>
                  <th className="px-3 py-2">DOB</th>
                  <th className="px-3 py-2">Handicap</th>
                  <th className="px-3 py-2">Prev. Opens</th>
                  <th className="px-3 py-2">In Field</th>
                  <th className="px-3 py-2">Issues</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={index}
                    className={cn("border-b border-surface-dark-foreground/10 last:border-0", row.errors.length > 0 && "bg-destructive/10")}
                  >
                    <td className="px-3 py-2 font-medium">{row.name || "—"}</td>
                    <td className="px-3 py-2">{row.countryCode ?? "SCO"}</td>
                    <td className="px-3 py-2">{row.raw.dateofbirth || "—"}</td>
                    <td className="px-3 py-2">{row.championshipHandicap ?? "—"}</td>
                    <td className="px-3 py-2">{row.previousOpens ?? "—"}</td>
                    <td className="px-3 py-2">{row.inField === undefined ? "—" : row.inField ? "Yes" : "No"}</td>
                    <td className="px-3 py-2 text-xs text-destructive">{row.errors.join("; ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={validRows.length === 0 || status === "submitting"}
        className="w-fit bg-accent px-6 py-3 text-sm font-bold uppercase tracking-wide text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {status === "submitting" ? "Uploading…" : `Upload ${validRows.length} player${validRows.length === 1 ? "" : "s"}`}
      </button>

      {summary ? (
        <div className="flex flex-col gap-2 border border-surface-dark-foreground/15 p-4">
          <p className="font-display text-lg font-bold">
            {summary.created} created · {summary.updated} updated{summary.errors > 0 ? ` · ${summary.errors} failed` : ""}
          </p>
          {rowErrors.length > 0 ? (
            <ul className="flex flex-col gap-1 text-sm text-destructive">
              {rowErrors.map((r, i) => (
                <li key={i}>
                  {r.name}: {r.error}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {status === "error" ? <p className="text-sm text-destructive">Upload failed — check your connection and try again.</p> : null}
    </div>
  );
}
