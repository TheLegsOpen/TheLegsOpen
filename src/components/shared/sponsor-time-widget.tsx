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
    <div className="relative h-12 w-12 shrink-0">
      <svg viewBox="0 0 64 64" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <circle cx="32" cy="32" r="30" fill="white" stroke={config.faceColor} strokeWidth="2" />
        {Array.from({ length: 12 }).map((_, i) => {
          const outer = tickPoint(i * 30, 27);
          const inner = tickPoint(i * 30, 24);
          return <line key={i} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke={config.faceColor} strokeWidth="1.5" />;
        })}
      </svg>

      <Hand angleDeg={hourAngle} imageUrl={config.hourHandUrl} length={12} thickness={3} color={config.faceColor} />
      <Hand angleDeg={minuteAngle} imageUrl={config.minuteHandUrl} length={18} thickness={2} color={config.faceColor} />
      <Hand angleDeg={secondAngle} imageUrl={config.secondHandUrl} length={20} thickness={1} color="#b5442e" />

      {config.centerCapUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={config.centerCapUrl}
          alt=""
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2"
        />
      ) : (
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: config.faceColor }}
        />
      )}
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
    <div className="flex h-full items-center gap-4 px-5 py-4 text-white" style={{ background: config.faceColor }}>
      <AnalogClock date={now} config={config} />
      <div className="flex flex-col gap-0.5">
        {config.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={config.logoUrl} alt={config.name} className="h-5 w-auto object-contain" />
        ) : (
          <p className="font-display text-lg font-bold uppercase tracking-wide">{config.name}</p>
        )}
        <p className="text-[10px] uppercase tracking-[0.14em] text-white/60">{config.tagline}</p>
      </div>
      <div className="ml-auto flex flex-col items-end gap-2 text-right">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-white/50">{SITE.nextVenue}</p>
          <p className="font-display text-sm font-bold tabular-nums">{venueTime}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-white/50">Your time</p>
          <p className="font-display text-sm font-bold tabular-nums">{localTime}</p>
        </div>
      </div>
    </div>
  );
}
