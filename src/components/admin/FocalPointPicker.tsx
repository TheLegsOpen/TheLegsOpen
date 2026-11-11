"use client";

import React from "react";
import { useField } from "@payloadcms/ui";

/**
 * "Banner focus" on an image in the Media library: click the part of the photo that must stay in
 * shot -- a champion's face -- and banners that crop the photo frame around it (see
 * focalPosition in src/lib/data/championships.ts).
 *
 * It writes Payload's own focalX / focalY, which every upload already stores. Payload's Edit Image
 * drawer only shows its focal-point tool when a collection generates image sizes, which ours
 * deliberately does not (each size is another copy of every photo in storage), so this puts the
 * same setting on the page instead.
 */
export function FocalPointPicker() {
  const { value: url } = useField<string>({ path: "url" });
  const { value: mimeType } = useField<string>({ path: "mimeType" });
  const x = useField<number>({ path: "focalX" });
  const y = useField<number>({ path: "focalY" });

  if (!url || (mimeType && !mimeType.startsWith("image/"))) return null;

  const fx = typeof x.value === "number" ? x.value : 50;
  const fy = typeof y.value === "number" ? y.value : 50;
  const isCentre = fx === 50 && fy === 50;

  const pick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = Math.round(((event.clientX - rect.left) / rect.width) * 100);
    const py = Math.round(((event.clientY - rect.top) / rect.height) * 100);
    x.setValue(Math.min(100, Math.max(0, px)));
    y.setValue(Math.min(100, Math.max(0, py)));
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <label className="field-label" style={{ display: "block", marginBottom: 4 }}>
        Banner focus
      </label>
      <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--theme-elevation-500)" }}>
        Click the part of the photo that must always stay in shot, usually the champion&apos;s face. Wide banners
        that crop this photo frame around that point. Then Save.
      </p>
      <div
        role="button"
        tabIndex={0}
        aria-label="Click to set the banner focus point"
        onClick={pick}
        style={{ position: "relative", display: "inline-block", maxWidth: 480, width: "100%", cursor: "crosshair", lineHeight: 0 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- admin-only preview of the original file */}
        <img src={url} alt="" style={{ width: "100%", height: "auto", borderRadius: 4, userSelect: "none" }} draggable={false} />
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: `${fx}%`,
            top: `${fy}%`,
            width: 22,
            height: 22,
            marginLeft: -11,
            marginTop: -11,
            borderRadius: "50%",
            border: "3px solid #fff",
            background: "rgba(242,190,58,0.85)",
            boxShadow: "0 0 0 2px rgba(0,0,0,0.5)",
            pointerEvents: "none",
          }}
        />
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8, fontSize: 13 }}>
        <span>{isCentre ? "Centre (not set)" : `Set: ${fx}% across, ${fy}% down`}</span>
        {!isCentre ? (
          <button
            type="button"
            onClick={() => {
              x.setValue(50);
              y.setValue(50);
            }}
            style={{ background: "none", border: "none", color: "var(--theme-success-500, #2269AB)", cursor: "pointer", padding: 0, textDecoration: "underline" }}
          >
            Reset to centre
          </button>
        ) : null}
      </div>
    </div>
  );
}
