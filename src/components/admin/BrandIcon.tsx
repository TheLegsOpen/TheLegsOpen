import React from "react";

import { getSiteTheme } from "@/lib/data/site-theme";

export async function BrandIcon() {
  const theme = await getSiteTheme();

  if (theme.logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={theme.logoUrl} alt="" style={{ height: 24, width: 24, objectFit: "contain" }} />;
  }

  return (
    <svg width="24" height="24" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
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
  );
}
