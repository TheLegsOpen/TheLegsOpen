import React from "react";

export function BrandLogo() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
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
