"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

import { Dialog, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ARTICLES } from "@/data/articles";
import { VENUES } from "@/data/venues";
import { PLAYERS } from "@/data/players";
import { playerSlug } from "@/lib/utils";

interface SearchResult {
  type: "Article" | "Venue" | "Player";
  title: string;
  href: string;
  meta: string;
}

function buildResults(query: string): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const articleResults: SearchResult[] = ARTICLES.filter((a) => a.title.toLowerCase().includes(q))
    .slice(0, 5)
    .map((a) => ({ type: "Article", title: a.title, href: `/latest/${a.slug}`, meta: a.category }));

  const venueResults: SearchResult[] = VENUES.filter((v) => v.name.toLowerCase().includes(q))
    .slice(0, 5)
    .map((v) => ({ type: "Venue", title: v.name, href: `/venues/${v.slug}`, meta: v.location }));

  const playerResults: SearchResult[] = PLAYERS.filter((p) => p.name.toLowerCase().includes(q))
    .slice(0, 5)
    .map((p) => ({ type: "Player", title: p.name, href: `/players/${playerSlug(p)}`, meta: p.country }));

  return [...articleResults, ...venueResults, ...playerResults];
}

export function SearchOverlay({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => buildResults(query), [query]);

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
              <DialogPrimitive.Close className="rounded-sm p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <X className="h-5 w-5" />
                <span className="sr-only">Close search</span>
              </DialogPrimitive.Close>
            </div>

            {query.trim().length >= 2 ? (
              results.length > 0 ? (
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
