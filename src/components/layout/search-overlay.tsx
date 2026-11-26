"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

import { Dialog, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

/** One entry in the index served by /api/search, built from the real articles, venues and players in Payload. */
export interface SearchResult {
  type: "Article" | "Venue" | "Player";
  title: string;
  href: string;
  meta: string;
}

// Up to five of each type, in the index's own order -- articles newest first, venues and players by name.
// Venues also match on their location, so a town name finds the course there.
function buildResults(index: SearchResult[], query: string): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  return (["Article", "Venue", "Player"] as const).flatMap((type) =>
    index
      .filter((r) => r.type === type && (r.title.toLowerCase().includes(q) || (type === "Venue" && r.meta.toLowerCase().includes(q))))
      .slice(0, 5),
  );
}

export function SearchOverlay({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<SearchResult[] | null>(null);
  const results = useMemo(() => buildResults(index ?? [], query), [index, query]);

  // Loaded the first time the overlay opens rather than with every page, then kept for the rest of
  // the visit. A failed load leaves it null, so the next open tries again.
  useEffect(() => {
    if (!open || index) return;
    let cancelled = false;
    fetch("/api/search")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: SearchResult[] | null) => {
        if (!cancelled && data) setIndex(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, index]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setQuery("");
      }}
    >
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 top-0 z-50 border-b border-border bg-card shadow-card-hover focus:outline-none"
        >
          <DialogPrimitive.Title className="sr-only">Search the site</DialogPrimitive.Title>
          <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6">
            <div className="flex items-center gap-3">
              <Search className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <Input
                autoFocus
                type="search"
                placeholder="Search news, players, venues…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-auto border-0 bg-transparent px-0 text-lg shadow-none focus-visible:ring-0"
              />
              <DialogPrimitive.Close className="flex h-8 w-8 shrink-0 items-center justify-center bg-[#2269AB] text-white transition-colors hover:bg-[#1b558a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <X className="h-4 w-4" />
                <span className="sr-only">Close search</span>
              </DialogPrimitive.Close>
            </div>

            {query.trim().length >= 2 ? (
              !index ? (
                <p className="border-t border-border py-6 text-center text-sm text-muted-foreground">Loading…</p>
              ) : results.length > 0 ? (
                <ul className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto border-t border-border pt-3">
                  {results.map((result) => (
                    <li key={`${result.type}-${result.title}`}>
                      <Link
                        href={result.href}
                        onClick={() => onOpenChange(false)}
                        className="flex items-center justify-between gap-4 rounded-md px-3 py-2.5 transition-colors hover:bg-secondary"
                      >
                        <span className="flex flex-col">
                          <span className="text-sm font-medium">{result.title}</span>
                          <span className="text-xs text-muted-foreground">{result.meta}</span>
                        </span>
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                          {result.type}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="border-t border-border py-6 text-center text-sm text-muted-foreground">
                  No results for &ldquo;{query}&rdquo;. Try a player, venue or news headline.
                </p>
              )
            ) : (
              <p className="border-t border-border py-6 text-sm text-muted-foreground">
                Try searching for a player name, a venue, or the latest news.
              </p>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
