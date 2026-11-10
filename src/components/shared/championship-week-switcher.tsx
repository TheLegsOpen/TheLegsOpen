"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

  const tabs = (
        <div role="tablist" aria-label="Championship week" className={cn("inline-flex w-fit gap-1 rounded-full border border-primary-foreground/15 p-1", onPhoto ? "bg-primary/70 backdrop-blur-sm" : "bg-primary-foreground/10")}>
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                role="tab"
                aria-selected={active}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-bold uppercase tracking-wide transition-colors",
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
