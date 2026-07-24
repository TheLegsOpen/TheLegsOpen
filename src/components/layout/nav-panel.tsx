"use client";

import Link from "next/link";

import { SheetClose } from "@/components/ui/sheet";
import { NAV_PANEL } from "@/data/navigation";
import { cn } from "@/lib/utils";

export function NavPanel({ onNavigate }: { onNavigate: () => void }) {
  return (
    <nav aria-label="Site" className="flex flex-col">
      {NAV_PANEL.map((group, index) => (
        <div
          key={group.heading ?? index}
          className={cn("flex flex-col gap-3 py-5", index > 0 && "border-t border-primary-foreground/10")}
        >
          {group.heading ? (
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground/50">
              {group.heading}
            </p>
          ) : null}
          <ul className="flex flex-col gap-3">
            {group.links.map((link) => (
              <li key={link.label}>
                <SheetClose asChild>
                  <Link
                    href={link.href}
                    onClick={onNavigate}
                    className={cn(
                      "block transition-colors hover:text-accent",
                      group.emphasis
                        ? "font-display text-lg font-bold uppercase tracking-wide"
                        : "text-sm text-primary-foreground/70",
                    )}
                  >
                    {link.label}
                  </Link>
                </SheetClose>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
