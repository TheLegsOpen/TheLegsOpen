"use client";

import { useLiveClock } from "@/hooks/use-live-clock";
import { SITE } from "@/constants/site";

const VENUE_TIME_ZONE = "Europe/London";

function AnalogClock({ date }: { date: Date | null }) {
  const hours = date ? date.getHours() % 12 : 0;
  const minutes = date ? date.getMinutes() : 0;
  const hourAngle = hours * 30 + minutes * 0.5;
  const minuteAngle = minutes * 6;

  function hand(angleDeg: number, length: number) {
    const rad = (angleDeg * Math.PI) / 180;
    // Rounded to 2dp: raw Math.sin/cos output can differ in the last float
    // digit between server and client, which fails hydration on an exact
    // string match even though the values are visually identical.
    return {
      x: Math.round((32 + Math.sin(rad) * length) * 100) / 100,
      y: Math.round((32 - Math.cos(rad) * length) * 100) / 100,
    };
  }

  const hourTip = hand(hourAngle, 14);
  const minuteTip = hand(minuteAngle, 21);

  return (
    <svg viewBox="0 0 64 64" className="h-12 w-12 shrink-0" aria-hidden="true">
      <circle cx="32" cy="32" r="30" fill="white" stroke="#0e3d2c" strokeWidth="2" />
      {Array.from({ length: 12 }).map((_, i) => {
        const outer = hand(i * 30, 27);
        const inner = hand(i * 30, 24);
        return <line key={i} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="#0e3d2c" strokeWidth="1.5" />;
      })}
      <line x1="32" y1="32" x2={hourTip.x} y2={hourTip.y} stroke="#0e3d2c" strokeWidth="3" strokeLinecap="round" />
      <line x1="32" y1="32" x2={minuteTip.x} y2={minuteTip.y} stroke="#0e3d2c" strokeWidth="2" strokeLinecap="round" />
      <circle cx="32" cy="32" r="2.5" fill="#0e3d2c" />
    </svg>
  );
}

/**
 * Fictional watch-partner clock module, structurally modelled on the
 * recurring sponsor widget seen throughout the reference site (venue time +
 * visitor's local time, sponsor's own brand colour rather than the site's
 * navy/gold system) — original brand name, wordmark and artwork throughout.
 */
export function SponsorTimeWidget() {
  const now = useLiveClock();

  const venueTime = now
    ? new Intl.DateTimeFormat("en-GB", { timeZone: VENUE_TIME_ZONE, hour: "2-digit", minute: "2-digit" }).format(now)
    : "--:--";
  const localTime = now ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(now) : "--:--";

  return (
    <div className="flex h-full items-center gap-4 bg-[#0e3d2c] px-5 py-4 text-white">
      <AnalogClock date={now} />
      <div className="flex flex-col gap-0.5">
        <p className="font-display text-lg font-bold uppercase tracking-wide">Meridian</p>
        <p className="text-[10px] uppercase tracking-[0.14em] text-white/60">Official Timekeeper</p>
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
