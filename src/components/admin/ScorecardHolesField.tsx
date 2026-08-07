"use client";

import React, { useEffect, useRef } from "react";
import { useField, useForm } from "@payloadcms/ui";
import type { ArrayFieldClientComponent } from "payload";

const TOTAL_HOLES = 18;
const HOLE_INDICES = Array.from({ length: TOTAL_HOLES }, (_, i) => i);

const cellInputStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 44,
  textAlign: "center",
  padding: "6px 2px",
  border: "1px solid var(--theme-elevation-150)",
  borderRadius: 4,
  fontSize: 13,
  background: "var(--theme-input-bg)",
  color: "inherit",
};

const headerCellStyle: React.CSSProperties = {
  padding: "6px 4px",
  fontSize: 12,
  fontWeight: 600,
  textAlign: "center",
  color: "var(--theme-elevation-500)",
};

const rowLabelStyle: React.CSSProperties = {
  padding: "6px 10px 6px 0",
  fontSize: 13,
  fontWeight: 600,
  whiteSpace: "nowrap",
};

const cellStyle: React.CSSProperties = { padding: 2 };

const summaryBarStyle: React.CSSProperties = {
  display: "flex",
  gap: 24,
  marginBottom: 12,
  padding: "10px 14px",
  borderRadius: 6,
  background: "var(--theme-elevation-100)",
  fontSize: 13,
};

const summaryLabelStyle: React.CSSProperties = {
  color: "var(--theme-elevation-500)",
  marginRight: 6,
};

function Cell({ path, max = 20 }: { path: string; max?: number }) {
  const { value, setValue } = useField<number>({ path });
  return (
    <input
      type="number"
      value={value ?? ""}
      min={0}
      max={max}
      onChange={(e) => {
        const raw = e.target.value;
        setValue(raw === "" ? null : Number(raw));
      }}
      style={cellInputStyle}
    />
  );
}

/** Strokes cell — accepts a number, or "X" for a hole the player picked up on (no return). */
function StrokesCell({ strokesPath, noReturnPath }: { strokesPath: string; noReturnPath: string }) {
  const { value: strokes, setValue: setStrokes } = useField<number>({ path: strokesPath });
  const { value: noReturn, setValue: setNoReturn } = useField<boolean>({ path: noReturnPath });

  function handleChange(raw: string) {
    const trimmed = raw.trim();
    if (trimmed === "") {
      setStrokes(null);
      setNoReturn(false);
      return;
    }
    if (trimmed.toUpperCase() === "X") {
      setStrokes(null);
      setNoReturn(true);
      return;
    }
    const num = Number(trimmed);
    if (!Number.isNaN(num)) {
      setStrokes(num);
      setNoReturn(false);
    }
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={noReturn ? "X" : (strokes ?? "")}
      onChange={(e) => handleChange(e.target.value)}
      title={noReturn ? "No return — DQ'd from Main/Scratch, Stableford continues" : undefined}
      style={{
        ...cellInputStyle,
        ...(noReturn ? { background: "var(--theme-error-100)", color: "var(--theme-error-500)", fontWeight: 700 } : {}),
      }}
    />
  );
}

function CheckboxCell({ path }: { path: string }) {
  const { value, setValue } = useField<boolean>({ path });
  return (
    <input
      type="checkbox"
      checked={value ?? false}
      onChange={(e) => setValue(e.target.checked)}
      style={{ width: 18, height: 18, cursor: "pointer" }}
    />
  );
}

function SummaryItem({ label, path, suffix }: { label: string; path: string; suffix?: string }) {
  const { value } = useField<number>({ path });
  return (
    <span>
      <span style={summaryLabelStyle}>{label}</span>
      <strong>{value ?? "—"}</strong>
      {suffix ? ` ${suffix}` : ""}
    </span>
  );
}

function NoReturnBadge() {
  const { value } = useField<boolean>({ path: "noReturn" });
  if (!value) return null;
  return (
    <span style={{ color: "var(--theme-error-500)", fontWeight: 700 }}>NR — Main &amp; Scratch disqualified, Stableford continues</span>
  );
}

export const ScorecardHolesField: ArrayFieldClientComponent = ({ path }) => {
  const { rows = [] } = useField<unknown[]>({ path, hasRows: true });
  const { addFieldRow } = useForm();
  const hasPadded = useRef(false);

  useEffect(() => {
    if (hasPadded.current || rows.length >= TOTAL_HOLES) return;
    hasPadded.current = true;
    for (let i = rows.length; i < TOTAL_HOLES; i++) {
      addFieldRow({ path, rowIndex: i, schemaPath: path });
    }
  }, [rows.length, addFieldRow, path]);

  const ready = rows.length >= TOTAL_HOLES;

  return (
    <div>
      <div style={summaryBarStyle}>
        <SummaryItem label="Thru" path="holesCompleted" suffix="/ 18" />
        <SummaryItem label="Gross" path="grossTotal" />
        <SummaryItem label="Nett" path="nettTotal" />
        <SummaryItem label="Stableford" path="stablefordTotal" suffix="pts" />
        <NoReturnBadge />
      </div>
      {!ready ? (
        <p style={{ fontSize: 13, color: "var(--theme-elevation-500)" }}>Setting up hole rows…</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th style={headerCellStyle} />
                {HOLE_INDICES.map((i) => (
                  <th key={i} style={headerCellStyle}>
                    {i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={rowLabelStyle}>Strokes</td>
                {HOLE_INDICES.map((i) => (
                  <td key={i} style={cellStyle}>
                    <StrokesCell strokesPath={`${path}.${i}.strokes`} noReturnPath={`${path}.${i}.noReturn`} />
                  </td>
                ))}
              </tr>
              <tr>
                <td style={rowLabelStyle}>Fairway Hit</td>
                {HOLE_INDICES.map((i) => (
                  <td key={i} style={cellStyle}>
                    <CheckboxCell path={`${path}.${i}.fairwayHit`} />
                  </td>
                ))}
              </tr>
              <tr>
                <td style={rowLabelStyle}>GIR</td>
                {HOLE_INDICES.map((i) => (
                  <td key={i} style={cellStyle}>
                    <CheckboxCell path={`${path}.${i}.greenInRegulation`} />
                  </td>
                ))}
              </tr>
              <tr>
                <td style={rowLabelStyle}>Putts</td>
                {HOLE_INDICES.map((i) => (
                  <td key={i} style={cellStyle}>
                    <Cell path={`${path}.${i}.putts`} max={10} />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
