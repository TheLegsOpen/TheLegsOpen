"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, ShoppingBag, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/container";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NavPanel } from "@/components/layout/nav-panel";
import { SearchOverlay } from "@/components/layout/search-overlay";
import { PRIMARY_NAV, SECONDARY_NAV } from "@/data/navigation";
import { SITE } from "@/constants/site";
import { useScrollDirection } from "@/hooks/use-scroll-direction";
import { cn } from "@/lib/utils";

export function Header() {
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
        "sticky top-0 z-30 bg-primary text-primary-foreground transition-shadow duration-300 ease-standard",
        isScrolled && "shadow-header",
      )}
    >
      <Container
        className={cn(
          "flex items-center justify-between gap-6 transition-[padding] duration-300 ease-standard",
          isScrolled ? "py-3" : "py-4",
        )}
      >
        <Link href="/" className="flex items-center gap-2 font-display text-xl tracking-tight sm:text-2xl">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-primary-foreground/30 text-sm">
            LO
          </span>
          {SITE.name}
        </Link>

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {PRIMARY_NAV.map((section) => {
              const active = isActive(section.href);
              return (
                <li key={section.label}>
                  <Link
                    href={section.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block border-b-2 border-transparent px-3.5 py-2 text-sm font-bold uppercase tracking-wide transition-colors hover:text-accent",
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
              className="hidden px-3 text-sm font-bold uppercase tracking-wide transition-colors hover:text-accent sm:block"
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
          <Button
            variant="ghost"
            size="icon"
            aria-label="The Clubhouse account"
            asChild
            className="hidden text-primary-foreground hover:bg-primary-foreground/10 hover:text-accent sm:inline-flex"
          >
            <Link href="/club">
              <User className="h-5 w-5" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Shop basket"
            asChild
            className="hidden text-primary-foreground hover:bg-primary-foreground/10 hover:text-accent sm:inline-flex"
          >
            <Link href="/shop">
              <ShoppingBag className="h-5 w-5" />
            </Link>
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
                <NavPanel onNavigate={() => setMobileOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </Container>

      <SearchOverlay open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}
