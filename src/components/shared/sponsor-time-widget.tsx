"use client";

import type { CSSProperties } from "react";

import { useLiveClock } from "@/hooks/use-live-clock";
import { SITE } from "@/constants/site";
import type { SponsorClock } from "@/lib/data/sponsor-clock";

const VENUE_TIME_ZONE = "Europe/London";

interface HandProps {
  angleDeg: number;
  imageUrl?: string;
  length: number;
  thickness: number;
  color: string;
}

/**
 * Renders either an admin-uploaded hand image or a plain drawn bar, using the
 * same rotation technique either way — the image (or bar) is anchored by its
 * bottom-center so `rotate()` pivots around the clock's center point.
 */
function Hand({ angleDeg, imageUrl, length, thickness, color }: HandProps) {
  const style: CSSProperties = {
    position: "absolute",
    left: "50%",
    top: "50%",
    height: length,
    transformOrigin: "50% 100%",
    transform: `translate(-50%, -100%) rotate(${angleDeg}deg)`,
  };

  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imageUrl} alt="" aria-hidden="true" style={{ ...style, width: "auto" }} />;
  }

  return <div aria-hidden="true" style={{ ...style, width: thickness, background: color, borderRadius: thickness / 2 }} />;
}

// Rounded to 2dp: raw Math.sin/cos output can differ in the last float digit
// between server and client, which fails hydration on an exact string match
// even though the values are visually identical.
function tickPoint(angleDeg: number, length: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: Math.round((32 + Math.sin(rad) * length) * 100) / 100,
    y: Math.round((32 - Math.cos(rad) * length) * 100) / 100,
  };
}

function AnalogClock({ date, config }: { date: Date | null; config: SponsorClock }) {
  const hours = date ? date.getHours() % 12 : 0;
  const minutes = date ? date.getMinutes() : 0;
  const seconds = date ? date.getSeconds() : 0;

  const hourAngle = hours * 30 + minutes * 0.5;
  const minuteAngle = minutes * 6;
  const secondAngle = seconds * 6;

  return (
    <div
      className="relative h-28 w-28 shrink-0 rounded-full p-1.5"
      style={{
        background: "conic-gradient(from 0deg, #d8d8d8, #f8f8f8, #b8b8b8, #eaeaea, #c4c4c4, #f4f4f4, #d8d8d8)",
        boxShadow: "0 2px 6px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(0,0,0,0.15)",
      }}
    >
      <div className="relative h-full w-full">
        {config.faceImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={config.faceImageUrl}
            srcSet={config.faceImageRetinaUrl ? `${config.faceImageUrl} 1x, ${config.faceImageRetinaUrl} 2x` : undefined}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full rounded-full object-cover"
          />
        ) : (
          <svg viewBox="0 0 64 64" className="absolute inset-0 h-full w-full" aria-hidden="true">
            <circle cx="32" cy="32" r="30" fill="white" stroke={config.faceColor} strokeWidth="2" />
            {Array.from({ length: 12 }).map((_, i) => {
              const outer = tickPoint(i * 30, 27);
              const inner = tickPoint(i * 30, 24);
              return <line key={i} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke={config.faceColor} strokeWidth="1.5" />;
            })}
          </svg>
        )}

        <Hand angleDeg={hourAngle} imageUrl={config.hourHandUrl} length={24} thickness={6} color={config.faceColor} />
        <Hand angleDeg={minuteAngle} imageUrl={config.minuteHandUrl} length={36} thickness={4} color={config.faceColor} />
        <Hand angleDeg={secondAngle} imageUrl={config.secondHandUrl} length={40} thickness={2} color="#b5442e" />

        {config.centerCapUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={config.centerCapUrl}
            alt=""
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2"
          />
        ) : (
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: config.faceColor }}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Fictional watch-partner clock module, structurally modelled on the
 * recurring sponsor widget seen throughout the reference site (venue time +
 * visitor's local time, sponsor's own brand colour rather than the site's
 * navy/gold system) — original brand name, wordmark and artwork throughout.
 * All of it (name, tagline, logo, face colour, hand/center graphics) is
 * admin-editable via the Sponsor Clock Widget global.
 */
export function SponsorTimeWidget({ config }: { config: SponsorClock }) {
  const now = useLiveClock(1000);

  const venueTime = now
    ? new Intl.DateTimeFormat("en-GB", { timeZone: VENUE_TIME_ZONE, hour: "2-digit", minute: "2-digit" }).format(now)
    : "--:--";
  const localTime = now ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(now) : "--:--";

  return (
    <div className="flex h-full items-center gap-4 px-5 py-5 text-white" style={{ background: config.faceColor }}>
      <AnalogClock date={now} config={config} />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          {config.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.logoUrl} alt={config.name} className="h-6 w-24 object-contain object-left" />
          ) : (
            <p className="font-display text-sm font-bold uppercase tracking-wide">{config.name}</p>
          )}
          <p className="text-[9px] uppercase tracking-[0.14em] text-white/50">{config.tagline}</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <div>
            <p className="text-[10px] uppercase tracking-wide" style={{ color: "#E8B04B" }}>
              {SITE.nextVenue}
            </p>
            <p className="font-display text-base font-bold tabular-nums leading-tight">{venueTime}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide" style={{ color: "#E8B04B" }}>
              Your time
            </p>
            <p className="font-display text-base font-bold tabular-nums leading-tight">{localTime}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
