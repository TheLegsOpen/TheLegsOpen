"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef } from "react";

import { Container } from "@/components/shared/container";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Tee Times", href: "/tee-times" },
  { label: "Statistics", href: "/statistics" },
];

/**
 * `onPhoto` drops the navy strip and container: the switcher is then placed on the page banner
 * itself (PageHero `overlay`), as theopen.com does on its leaderboard, tee times and statistics.
 */
export function ChampionshipWeekSwitcher({ onPhoto = false }: { onPhoto?: boolean } = {}) {
  const pathname = usePathname();
  const barRef = useRef<HTMLDivElement>(null);

  // A zoomed page or a larger text setting leaves the phone bar under 300px, where the three
  // labels at 15px need 302 and "Statistics" was cut off. Shrink them a pixel at a time until they
  // fit (down to 11px); from sm up the floating pill has room, so leave its size alone.
  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const fit = () => {
      const links = [...bar.querySelectorAll<HTMLElement>("a")];
      links.forEach((a) => (a.style.fontSize = ""));
      if (window.matchMedia("(min-width: 640px)").matches) return;
      let size = parseFloat(getComputedStyle(links[0]).fontSize);
      while (bar.scrollWidth > bar.clientWidth && size > 11) {
        size -= 1;
        links.forEach((a) => (a.style.fontSize = `${size}px`));
      }
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(bar);
    return () => observer.disconnect();
  }, []);

  // On a phone this is theopen.com's segmented bar: the full width of the page, the three labels
  // sharing it on one line each (39px tall, 15px type, thin rules between), rounded only at the
  // two ends. From sm up it is the floating pill with a gap between tabs.
  const tabs = (
        <div
          ref={barRef}
          role="tablist"
          aria-label="Championship week"
          className={cn(
            "flex w-full overflow-hidden rounded-full border border-primary-foreground/20 sm:inline-flex sm:w-fit sm:gap-1 sm:overflow-visible sm:border-primary-foreground/15 sm:p-1",
            onPhoto ? "bg-primary/70 backdrop-blur-sm" : "bg-primary-foreground/10",
          )}
        >
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                role="tab"
                aria-selected={active}
                className={cn(
                  "flex h-[39px] flex-auto items-center justify-center whitespace-nowrap border-l border-primary-foreground/20 px-[5px] text-[15px] font-bold uppercase tracking-wide transition-colors first:border-l-0",
                  "sm:h-auto sm:flex-none sm:rounded-full sm:border-l-0 sm:px-4 sm:py-2 sm:text-sm",
                  active ? "bg-white text-primary" : "text-primary-foreground/70 hover:text-primary-foreground",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
  );

  if (onPhoto) return tabs;
  return (
    <div className="bg-primary py-3">
      <Container>{tabs}</Container>
    </div>
  );
}
