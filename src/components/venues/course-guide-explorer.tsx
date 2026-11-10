"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn, ordinal } from "@/lib/utils";
import type { CourseGuide } from "@/lib/data/course-guide";

const SECTION_TITLE = "font-menu text-[14px] font-bold uppercase leading-[16px] tracking-[1.6px] text-[#43524E]";

function signed(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}`;
}

/**
 * The course page's hole-by-hole guide, after standrews.com's course pages. The 18 tiles
 * are the hole picker -- pick one and its strokesaver image and numbers show underneath.
 */
export function CourseGuideExplorer({ guide, venueName }: { guide: CourseGuide; venueName: string }) {
  const { holes, hardest, easiest, playedCount } = guide;
  const [selected, setSelected] = useState(1);
  const hole = holes.find((h) => h.holeNumber === selected) ?? holes[0];
  if (!hole) return null;
  const step = (d: number) => setSelected((n) => ((n - 1 + d + holes.length) % holes.length) + 1);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className={SECTION_TITLE}>Course guide · hole by hole</h2>
          <p className="text-xs text-[#43524E]">
            {playedCount > 0
              ? `Field average (gross) over ${playedCount} Legs Open${playedCount === 1 ? "" : "s"} here. Red: hardest. Green: easiest.`
              : "Not yet played in the Legs Open: par, stroke index and yardage only."}
          </p>
        </div>
        <ol className="grid grid-cols-3 gap-px bg-[#B9BEC0] sm:grid-cols-6 lg:grid-cols-9">
          {holes.map((h) => {
            const on = h.holeNumber === selected;
            return (
              <li key={h.holeNumber}>
                <button
                  type="button"
                  onClick={() => setSelected(h.holeNumber)}
                  aria-pressed={on}
                  className={cn(
                    "flex h-full w-full flex-col gap-1 bg-white p-3 text-left transition-colors hover:bg-[#EEF2F4]",
                    h.holeNumber === hardest && "bg-[#CB333B] text-white hover:bg-[#b52d34]",
                    h.holeNumber === easiest && "bg-[#0E3D2C] text-white hover:bg-[#0b3022]",
                    on && "outline outline-4 -outline-offset-4 outline-accent",
                  )}
                >
                  <span className="font-menu text-[22px] font-bold leading-none">{h.holeNumber}</span>
                  <span className="text-[11px] uppercase tracking-wide opacity-70">
                    Par {h.par}
                    {h.si ? ` · SI ${h.si}` : ""}
                  </span>
                  {h.yards ? <span className="text-[11px] opacity-70">{h.yards} yds</span> : null}
                  {h.average !== undefined ? (
                    <span className="mt-1 font-sans text-[15px] font-bold tabular-nums">
                      {h.average.toFixed(2)}
                      <span className="ml-1 text-[11px] font-normal opacity-70">({signed(h.average - h.par)})</span>
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {/* The selected hole */}
      <div className="grid grid-cols-1 gap-8 bg-primary text-white lg:grid-cols-[minmax(0,560fr)_minmax(0,666fr)]">
        <div className="relative aspect-[3/4] w-full bg-[#0b0a2e]">
          {hole.imageUrl ? (
            <Image src={hole.imageUrl} alt={`${venueName}, hole ${hole.holeNumber}`} fill sizes="(min-width: 1024px) 560px, 100vw" className="object-contain" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
              <span className="font-menu text-[120px] font-bold leading-none text-white/10">{hole.holeNumber}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col justify-between gap-8 p-8 lg:py-12 lg:pr-12">
          <div className="flex flex-col gap-6">
            <p className="font-menu text-[14px] font-bold uppercase tracking-[1.6px] text-accent">{venueName}</p>
            <h3 className="font-menu text-[56px] font-bold uppercase leading-none">Hole {hole.holeNumber}</h3>
            <dl className="grid grid-cols-2 gap-px bg-white/15 sm:grid-cols-4">
              {[
                { label: "Par", value: String(hole.par) },
                { label: "Stroke index", value: hole.si ? String(hole.si) : "—" },
                { label: "Yards", value: hole.yards ? String(hole.yards) : "—" },
                { label: "Field average", value: hole.average !== undefined ? hole.average.toFixed(2) : "—" },
              ].map((item) => (
                <div key={item.label} className="flex flex-col gap-1 bg-primary p-4">
                  <dt className="text-[11px] uppercase tracking-wide text-white/60">{item.label}</dt>
                  <dd className="font-menu text-[28px] font-bold tabular-nums leading-none">{item.value}</dd>
                </div>
              ))}
            </dl>
            {hole.average !== undefined ? (
              <p className="text-white/80">
                The field has averaged {signed(hole.average - hole.par)} here
                {hole.holeNumber === hardest ? ", the hardest hole on the course in Legs Open play" : ""}
                {hole.holeNumber === easiest ? ", the easiest hole on the course in Legs Open play" : ""}.
              </p>
            ) : null}
            {hole.description ? (
              <div className="flex max-w-[60ch] flex-col gap-4 font-sans text-[18px] font-light leading-[28px] text-white/90">
                {hole.description.split(/\n\s*\n/).map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => step(-1)} className="inline-flex items-center gap-2 border border-white/30 px-4 py-2 text-sm font-bold uppercase hover:border-accent hover:text-accent">
              <ChevronLeft className="h-4 w-4" /> {ordinal(((selected - 2 + holes.length) % holes.length) + 1)}
            </button>
            <button type="button" onClick={() => step(1)} className="inline-flex items-center gap-2 bg-accent px-4 py-2 text-sm font-bold uppercase text-[#06051e] hover:bg-white">
              {ordinal((selected % holes.length) + 1)} <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
