"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { NewsTickerItem } from "@/lib/data/news-ticker";

/**
 * How fast the row travels, in pixels per second.
 *
 * Measured off The Open's own bar: its marquee translates -2270px over 38.3513s. Holding a speed
 * rather than a duration is the point -- our animation is a fixed 22s over translateX(-50%), so
 * the distance is whatever the headlines happen to add up to and the bar silently reads faster
 * the more items are in it. Six headlines scrolled at about 84px/s, half again as quick as this.
 */
const PIXELS_PER_SECOND = 59.19;

function TickerLink({ item }: { item: NewsTickerItem }) {
  const isExternal = /^https?:\/\//.test(item.url);
  // The Open's live-band link, matched to its computed style: Founders Grotesk 16/700, 25.12px
  // line-height, no tracking, #2a2a2a, underlined. Their family reads as "Founders Grotesk Light"
  // at weight 700, which is only what they named that webfont; font-sans resolves to our own 700
  // face, so the rendered weight is the same.
  //
  // #2a2a2a measures 8.4:1 on the gold bar, so it clears AA with room. Hover drops the underline,
  // which is the pattern the rich-text block already uses for links.
  //
  // tracking-normal rather than an arbitrary [0px]: Chrome serialises letter-spacing: 0 back as
  // `normal`, so the two are indistinguishable once computed and the standard class is the honest
  // one. Measuring tools read `normal` here against the `0` theopen.com reports -- same zero.
  const className =
    "font-sans text-[16px] font-bold leading-[25.12px] tracking-normal text-[#2a2a2a] underline hover:no-underline";

  if (isExternal) {
    return (
      <a href={item.url} target="_blank" rel="noopener noreferrer" className={className}>
        {item.headline}
      </a>
    );
  }
  return (
    <Link href={item.url} className={className}>
      {item.headline}
    </Link>
  );
}

export function NewsTicker({ items }: { items: NewsTickerItem[] }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [seconds, setSeconds] = useState<number>();

  // The row holds two copies of the list and the keyframe travels translateX(-50%), so one copy's
  // width is the distance covered per cycle. Measured rather than counted: headline lengths vary,
  // and it is the pixels that set the speed. Re-measured on resize because a font swapping in or
  // a narrower viewport changes the width underneath us.
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const measure = () => {
      const distance = row.offsetWidth / 2;
      if (distance > 0) setSeconds(distance / PIXELS_PER_SECOND);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <div className="flex h-[65px] items-stretch overflow-hidden bg-accent">
      <span className="flex shrink-0 items-center gap-1.5 bg-primary px-4 text-xs font-bold uppercase tracking-wide text-primary-foreground">
        <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-accent" aria-hidden="true" />
        Championship Day
      </span>
      <div className="relative flex-1 overflow-hidden">
        {/* 15px between items, which with each item's own 16px of right padding puts the divider
            centred in roughly equal space either side -- the spacing The Open uses. Until the
            effect above has measured, the 22s from the Tailwind keyframe applies for a frame. */}
        <div
          ref={rowRef}
          className="flex h-full w-max animate-ticker-scroll items-center gap-[15px] whitespace-nowrap pl-8 motion-reduce:animate-none"
          style={seconds ? { animationDuration: `${seconds}s` } : undefined}
        >
          {[...items, ...items].map((item, index) => (
            <span key={index} className="flex items-center">
              <TickerLink item={item} />
              {/* A 1px rule rather than a bullet: border-right on each item on The Open's bar,
                  #CB333B, the height of the text row. */}
              <span className="ml-4 h-[25px] w-px shrink-0 bg-[#CB333B]" aria-hidden="true" />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
