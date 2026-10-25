import Link from "next/link";

import type { NewsTickerItem } from "@/lib/data/news-ticker";

function TickerLink({ item }: { item: NewsTickerItem }) {
  const isExternal = /^https?:\/\//.test(item.url);
  const className = "text-sm font-bold text-accent-foreground hover:underline";

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
