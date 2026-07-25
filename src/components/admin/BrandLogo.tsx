import React from "react";

import { getSiteTheme } from "@/lib/data/site-theme";

export async function BrandLogo() {
  const theme = await getSiteTheme();

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
      {theme.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={theme.logoUrl} alt="" style={{ height: 56, width: 56, objectFit: "contain" }} />
      ) : (
        <svg width="56" height="56" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="31" fill="#06051E" stroke="#FFB800" strokeWidth="2" />
          <text
            x="32"
            y="34"
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="Fraunces, Georgia, serif"
            fontWeight={700}
            fontSize="24"
            letterSpacing="0.5"
            fill="#FFB800"
          >
            LO
          </text>
        </svg>
      )}
      <span
        style={{
          fontFamily: "Fraunces, Georgia, serif",
          fontWeight: 700,
          fontSize: "20px",
          letterSpacing: "0.01em",
          color: "var(--theme-text)",
        }}
      >
        The Legs Open
      </span>
    </div>
  );
}
