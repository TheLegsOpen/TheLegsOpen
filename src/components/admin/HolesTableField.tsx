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

const summaryCellStyle: React.CSSProperties = {
  ...cellInputStyle,
  border: "none",
  background: "var(--theme-elevation-100)",
  fontWeight: 600,
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

function Cell({ path, min, max }: { path: string; min?: number; max?: number }) {
  const { value, setValue } = useField<number>({ path });
  return (
    <input
      type="number"
      value={value ?? ""}
      min={min}
      max={max}
      onChange={(e) => {
        const raw = e.target.value;
        setValue(raw === "" ? null : Number(raw));
      }}
      style={cellInputStyle}
    />
  );
}

function SummaryValue({ path }: { path: string }) {
  const { value } = useField<number>({ path });
  return <span style={summaryCellStyle}>{value ?? "—"}</span>;
}

export const HolesTableField: ArrayFieldClientComponent = ({ path }) => {
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

  if (!ready) {
    return <p style={{ fontSize: 13, color: "var(--theme-elevation-500)" }}>Setting up hole rows…</p>;
  }

  return (
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
            <th style={headerCellStyle}>Out</th>
            <th style={headerCellStyle}>In</th>
            <th style={headerCellStyle}>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={rowLabelStyle}>Yardage</td>
            {HOLE_INDICES.map((i) => (
              <td key={i} style={cellStyle}>
                <Cell path={`${path}.${i}.yards`} />
              </td>
            ))}
            <td style={cellStyle}>
              <SummaryValue path="outYards" />
            </td>
            <td style={cellStyle}>
              <SummaryValue path="inYards" />
            </td>
            <td style={cellStyle}>
              <SummaryValue path="totalYards" />
            </td>
          </tr>
          <tr>
            <td style={rowLabelStyle}>Par</td>
            {HOLE_INDICES.map((i) => (
              <td key={i} style={cellStyle}>
                <Cell path={`${path}.${i}.par`} min={3} max={6} />
              </td>
            ))}
            <td style={cellStyle}>
              <SummaryValue path="outPar" />
            </td>
            <td style={cellStyle}>
              <SummaryValue path="inPar" />
            </td>
            <td style={cellStyle}>
              <SummaryValue path="totalPar" />
            </td>
          </tr>
          <tr>
            <td style={rowLabelStyle}>Stroke Index</td>
            {HOLE_INDICES.map((i) => (
              <td key={i} style={cellStyle}>
                <Cell path={`${path}.${i}.si`} min={1} max={18} />
              </td>
            ))}
            <td colSpan={3} />
          </tr>
        </tbody>
      </table>
    </div>
  );
};
