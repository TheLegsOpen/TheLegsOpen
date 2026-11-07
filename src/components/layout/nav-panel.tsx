"use client";

import Link from "next/link";
import Image from "next/image";

import { SheetClose } from "@/components/ui/sheet";
import { buildNavPanel } from "@/data/navigation";
import type { NavLink } from "@/types/nav";
import type { SponsorEntry } from "@/lib/data/sponsors";
import { cn } from "@/lib/utils";

/**
 * The slide-out menu, set the way The Open sets theirs.
 *
 * Measured off theopen.com's own panel rather than approximated, because the two type roles in
 * it are further apart than they look: the headline links are Cardinal Photo at 14px/700 over
 * 1.6px of tracking, uppercase, while everything beneath is Founders Grotesk at 16px/300 in
 * sentence case -- the secondary links are the LARGER of the two. Ours had that inverted, with
 * 18px bold display headings over 14px secondary links dimmed to 70% opacity.
 *
 * Section labels (VENUES) are 12px Cardinal Photo at weight 400 over 1.6px, and the patrons
 * heading the same at 1.9px, centred. Nothing in their panel is dimmed; the hierarchy is carried
 * by size and face, and every link is full white.
 */
export function NavPanel({
  onNavigate,
  venueLinks = [],
  logoUrl,
  patrons = [],
}: {
  onNavigate: () => void;
  venueLinks?: NavLink[];
  logoUrl?: string;
  patrons?: SponsorEntry[];
}) {
  const groups = buildNavPanel(venueLinks);

  return (
    <nav aria-label="Site" className="flex flex-col">
      {logoUrl ? (
        <SheetClose asChild>
          <Link href="/" onClick={onNavigate} className="flex items-center gap-3 pb-2 pt-1">
            {/* 69x31 is the size their own mark sits at in the panel header. */}
            <Image src={logoUrl} alt="The Legs Open" width={69} height={31} className="h-[31px] w-auto object-contain" />
          </Link>
        </SheetClose>
      ) : null}

      {groups.map((group, index) => (
        <div
          key={group.heading ?? index}
          className={cn("flex flex-col gap-3 py-5", index > 0 && "border-t border-primary-foreground/15")}
        >
          {group.heading ? (
            <p className="font-menu text-[12px] font-normal uppercase leading-[13.8px] tracking-[1.6px] text-primary-foreground">
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
                      "block text-primary-foreground transition-colors hover:text-accent",
                      group.emphasis
                        ? "font-menu text-[14px] font-bold uppercase leading-[16.1px] tracking-[1.6px]"
                        : "font-sans text-[16px] font-light leading-[18.4px]",
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

      {patrons.length > 0 ? (
        <div className="flex flex-col gap-5 border-t border-primary-foreground/15 py-6">
          <p className="text-center font-menu text-[12px] font-normal uppercase leading-[13.8px] tracking-[1.9px] text-primary-foreground">
            Our Patrons
          </p>
          {/* Four across at 69x40, the grid they use. Logos are the uploaded artwork in its own
              colours, so they sit on the navy exactly as they do in the footer -- no attempt to
              force them white, which would wreck any mark that is not a flat silhouette. */}
          <ul className="grid grid-cols-4 items-center gap-x-4 gap-y-5">
            {patrons.map((patron) => (
              <li key={patron.name} className="flex items-center justify-center">
                {patron.logoUrl ? (
                  <Image
                    src={patron.logoUrl}
                    alt={patron.name}
                    width={69}
                    height={40}
                    className="h-10 w-[69px] object-contain"
                  />
                ) : (
                  <span className="text-center font-sans text-[11px] leading-tight text-primary-foreground/70">
                    {patron.name}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </nav>
  );
}
