"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NavPanel } from "@/components/layout/nav-panel";
import { SearchOverlay } from "@/components/layout/search-overlay";
import { PRIMARY_NAV, SECONDARY_NAV } from "@/data/navigation";
import { SITE } from "@/constants/site";
import { useScrollDirection } from "@/hooks/use-scroll-direction";
import { cn } from "@/lib/utils";
import type { NavLink } from "@/types/nav";
import type { SponsorEntry } from "@/lib/data/sponsors";

export function Header({
  logoUrl,
  venueLinks,
  patrons = [],
}: {
  logoUrl?: string;
  venueLinks?: NavLink[];
  /** Forwarded to the slide-out panel, which carries an Our Patrons block as The Open's does. */
  patrons?: SponsorEntry[];
}) {
  const { isScrolled } = useScrollDirection();
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-30 h-[52px] md:h-[60px] w-full bg-primary text-primary-foreground transition-shadow duration-300 ease-standard",
        isScrolled && "shadow-header",
      )}
    >
      {/*
       * Full-bleed rather than the shared Container, which centres on max-w-container (1430px)
       * and pads lg:px-8 -- on a wide screen that leaves the logo and the icons floating well
       * inside the bar instead of sitting near its edges. theopen.com runs its header to the
       * full width of the window with a fixed inset, which is what this matches: 70px in from
       * each side, stepping down on narrow screens where 140px of padding would eat the bar.
       *
       * The nav is absolutely centred rather than being the middle child of a justify-between
       * row. In flow it would only ever land halfway between the two groups, so it shifted
       * whenever the logo or the icons changed width; out of flow it is centred on the header
       * itself and stays put.
       */}
      <div className="relative flex h-full items-center justify-between px-5 md:px-[30px] lg:px-[70px]">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-menu text-[17px] font-black uppercase leading-[16px] tracking-[1.6px] text-white no-underline"
        >
          {logoUrl ? (
            <Image src={logoUrl} alt="" width={36} height={36} className="h-9 w-9 rounded-full object-contain" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-primary-foreground/30 text-sm">
              LO
            </span>
          )}
          {SITE.name}
        </Link>

        <nav aria-label="Primary" className="absolute left-1/2 hidden -translate-x-1/2 lg:block">
          <ul className="flex items-center gap-8">
            {PRIMARY_NAV.map((section) => {
              const active = isActive(section.href);
              return (
                <li key={section.label}>
                  <Link
                    href={section.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block border-b-2 border-transparent py-2 font-menu text-sm font-bold uppercase leading-[16.1px] tracking-[1.6px] text-white no-underline transition-colors hover:text-accent",
                      active && "border-accent text-accent",
                    )}
                  >
                    {section.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-1">
          {SECONDARY_NAV.map((section) => (
            <Link
              key={section.label}
              href={section.href}
              className="hidden px-3 font-menu text-sm font-bold uppercase leading-[16.1px] tracking-[1.6px] text-white no-underline transition-colors hover:text-accent sm:block"
            >
              {section.label}
            </Link>
          ))}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Search"
            onClick={() => setSearchOpen(true)}
            className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-accent"
          >
            <Search className="h-5 w-5" />
          </Button>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open menu"
                className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-accent"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="overflow-y-auto border-primary-foreground/10 bg-primary text-primary-foreground"
            >
              <SheetTitle className="text-primary-foreground">Menu</SheetTitle>
              <div className="mt-2">
                <NavPanel
                  onNavigate={() => setMobileOpen(false)}
                  venueLinks={venueLinks}
                  logoUrl={logoUrl}
                  patrons={patrons}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <SearchOverlay open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}
