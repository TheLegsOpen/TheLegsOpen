"use client";

import { useEffect, useState } from "react";

import { Container } from "@/components/shared/container";

/**
 * PREVIEW (27): a slim "days to go" banner for the next championship. Counts in whole UK days,
 * worked out in the browser so a cached page never shows yesterday's number, and switches itself
 * off on the day.
 */
export function CountdownBanner({ dateIso, label }: { dateIso: string; label: string }) {
  const [days, setDays] = useState<number | null>(null);

  useEffect(() => {
    const ukDay = (d: Date) => new Date(d.toLocaleDateString("en-CA", { timeZone: "Europe/London" })).getTime();
    const tick = () => setDays(Math.round((ukDay(new Date(dateIso)) - ukDay(new Date())) / 86_400_000));
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 60 * 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [dateIso]);

  if (days === null || days <= 0) return null;

  const date = new Date(dateIso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" });
  return (
    <div className="bg-primary text-primary-foreground">
      <Container className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3">
        <span className="font-menu text-[28px] font-bold leading-none tabular-nums text-accent">{days}</span>
        <span className="font-menu text-[14px] uppercase tracking-[1.6px]">{days === 1 ? "day" : "days"} to go</span>
        <span className="text-sm text-primary-foreground/70">
          {label} · {date}
        </span>
      </Container>
    </div>
  );
}
