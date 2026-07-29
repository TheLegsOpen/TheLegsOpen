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

export function ChampionshipWeekSwitcher() {
  const pathname = usePathname();

  return (
    <div className="bg-primary bg-dashboard-pattern py-3">
      <Container>
        <div role="tablist" aria-label="Championship week" className="inline-flex gap-1 rounded-full border border-primary-foreground/15 bg-primary-foreground/10 p-1">
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
      </Container>
    </div>
  );
}
