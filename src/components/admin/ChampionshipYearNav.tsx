"use client";

import React, { useEffect, useState } from "react";
import { useDocumentInfo, useConfig, Link } from "@payloadcms/ui";

interface YearEntry {
  id: string;
  year: number;
}

const buttonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 12px",
  fontSize: 13,
  fontWeight: 600,
  border: "1px solid var(--theme-elevation-150)",
  borderRadius: 4,
  background: "var(--theme-input-bg)",
  color: "var(--theme-text)",
  textDecoration: "none",
};

const disabledStyle: React.CSSProperties = {
  ...buttonStyle,
  opacity: 0.4,
  pointerEvents: "none",
};

/** Prev/Next Year navigation for the Championships edit view, so you can page through 2013 -> 2014 -> 2015 etc. without going back to the list. */
export const ChampionshipYearNav: React.FC = () => {
  const { id } = useDocumentInfo();
  const { config } = useConfig();
  const [years, setYears] = useState<YearEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/championships?limit=500&depth=0&sort=year")
      .then((res) => res.json())
      .then((data: { docs: { id: string | number; year: number }[] }) => {
        if (!cancelled) setYears(data.docs.map((doc) => ({ id: String(doc.id), year: doc.year })));
      })
      .catch(() => {
        if (!cancelled) setYears([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!id || !years || years.length === 0) return null;

  const index = years.findIndex((y) => y.id === String(id));
  if (index === -1) return null;

  const prev = years[index - 1];
  const next = years[index + 1];
  const adminRoute = config.routes.admin;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 12 }}>
      {prev ? (
        <Link href={`${adminRoute}/collections/championships/${prev.id}`} style={buttonStyle}>
          ← {prev.year}
        </Link>
      ) : (
        <span style={disabledStyle}>← —</span>
      )}
      <span style={{ fontSize: 12, color: "var(--theme-elevation-500)", whiteSpace: "nowrap" }}>
        {index + 1} of {years.length}
      </span>
      {next ? (
        <Link href={`${adminRoute}/collections/championships/${next.id}`} style={buttonStyle}>
          {next.year} →
        </Link>
      ) : (
        <span style={disabledStyle}>— →</span>
      )}
    </div>
  );
};
