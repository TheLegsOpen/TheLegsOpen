"use client";

import { useCountdown } from "@/hooks/use-countdown";
import { formatDate } from "@/lib/utils";

const UNITS: Array<{ key: "days" | "hours" | "minutes" | "seconds"; label: string }> = [
  { key: "days", label: "Days" },
  { key: "hours", label: "Hours" },
  { key: "minutes", label: "Mins" },
  { key: "seconds", label: "Secs" },
];

export function Countdown({ targetIso }: { targetIso: string }) {
  const value = useCountdown(targetIso);

  return (
    <div>
      <div aria-hidden="true" className="flex gap-2.5 sm:gap-3">
        {UNITS.map((unit) => (
          <div
            key={unit.key}
            className="flex w-16 flex-col items-center gap-1 rounded-md bg-primary-foreground/10 py-2.5 tabular-nums"
          >
            <span className="font-display font-bold text-2xl leading-none sm:text-3xl">
              {String(value[unit.key]).padStart(2, "0")}
            </span>
            <span className="text-[11px] uppercase tracking-wide text-primary-foreground/70">
              {unit.label}
            </span>
          </div>
        ))}
      </div>
      <p className="sr-only" aria-live="polite">
        {value.isComplete
          ? "The ballot has now closed."
          : `Ballot closes ${formatDate(targetIso)}, in ${value.days} days.`}
      </p>
    </div>
  );
}
