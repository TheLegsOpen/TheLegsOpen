import Link from "next/link";

import type { NewsTickerItem } from "@/lib/data/news-ticker";

function TickerLink({ item }: { item: NewsTickerItem }) {
  const isExternal = /^https?:\/\//.test(item.url);
  // The Open's live-band link, matched to its computed style: Founders Grotesk 16/700, 25.12px
  // line-height, no tracking, #2a2a2a, underlined by default rather than on hover. The family
  // reads as "Founders Grotesk Light" there, which is just what they named the webfont -- the
  // weight is 700 either way, and font-sans resolves to our own 700 face.
  //
  // #2a2a2a is a softer dark than the near-black we had; on the gold bar it measures 8.4:1, so
  // it clears AA comfortably. Hover drops the underline, which is the pattern the rich-text
  // block already uses for links.
  //
  // tracking-normal rather than an arbitrary [0px]: Chrome serialises letter-spacing: 0 back as
  // `normal`, so the two are indistinguishable once computed and the standard class is the
  // honest one. Measuring tools will read `normal` here against the `0` theopen.com reports --
  // same zero tracking either way.
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
  if (items.length === 0) return null;

  return (
    // 65px to match the band The Open runs under its own header, and a fixed height rather than
    // one derived from padding so the bar does not change size with the text inside it. The label
    // and the scroller both stretch to fill it.
    <div className="flex h-[65px] items-stretch overflow-hidden bg-accent">
      <span className="flex shrink-0 items-center gap-1.5 bg-primary px-4 text-xs font-bold uppercase tracking-wide text-primary-foreground">
        <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-accent" aria-hidden="true" />
        Championship Day
      </span>
      <div className="relative flex-1 overflow-hidden">
        <div className="flex h-full w-max animate-ticker-scroll items-center gap-12 whitespace-nowrap pl-8 motion-reduce:animate-none">
          {[...items, ...items].map((item, index) => (
            <span key={index} className="flex items-center gap-3">
              <TickerLink item={item} />
              <span className="text-accent-foreground/40" aria-hidden="true">
                •
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
