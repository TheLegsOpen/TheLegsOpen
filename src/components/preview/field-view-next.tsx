"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Check, ChevronDown, ChevronUp, Search, Star, Trophy, X } from "lucide-react";

import { Container } from "@/components/shared/container";
import { CountryFlag } from "@/components/shared/country-flag";
import { PlaceholderArt } from "@/components/shared/placeholder-art";
import { COUNTRIES } from "@/data/countries";
import { useFavorites } from "@/hooks/use-favorites";
import { cn, playerSlug, splitSurnameFirst } from "@/lib/utils";
import type { Player } from "@/types/player";
import type { ChampionshipWinner } from "@/types/championship";

type ChipId = "champions" | "debutants" | "mine";

const CHIPS: { id: ChipId; label: string }[] = [
  { id: "champions", label: "Past Champions" },
  { id: "debutants", label: "Debutants" },
  { id: "mine", label: "My players" },
];

/**
 * PREVIEW (18, 19, 28): theopen.com's field grid -- six across, tiles touching, the name over the
 * photo (first name over SURNAME, bottom right) and the flag top right -- with tick-box chips that
 * combine (Champions + Debutants + My players + a country all at once), a Hide filters toggle, and
 * a star on each tile to add a player to My players (saved in this browser, shared with the
 * leaderboard's stars).
 */
export function FieldViewNext({
  players,
  debutantIds,
  championshipHistory,
  championLogoUrl,
}: {
  players: Player[];
  debutantIds: string[];
  championshipHistory: ChampionshipWinner[];
  championLogoUrl?: string;
}) {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("All");
  const [chips, setChips] = useState<Set<ChipId>>(() => new Set());
  const [filtersOpen, setFiltersOpen] = useState(true);
  const { favorites, toggleFavorite, hydrated } = useFavorites();

  const championYearsBySlug = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const c of championshipHistory) {
      if (!c.winnerPlayerSlug) continue;
      map.set(c.winnerPlayerSlug, [...(map.get(c.winnerPlayerSlug) ?? []), c.year].sort((a, b) => a - b));
    }
    return map;
  }, [championshipHistory]);
  const debutants = useMemo(() => new Set(debutantIds), [debutantIds]);
  const availableCountries = useMemo(() => {
    const codes = new Set(players.map((p) => p.countryCode));
    return COUNTRIES.filter((c) => codes.has(c.code)).sort((a, b) => a.name.localeCompare(b.name));
  }, [players]);

  function toggleChip(id: ChipId) {
    setChips((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const q = query.trim().toLowerCase();
  const filtered = players.filter((player) => {
    if (q && !player.name.toLowerCase().includes(q) && !player.country.toLowerCase().includes(q)) return false;
    if (country !== "All" && player.countryCode !== country) return false;
    if (chips.has("champions") && !championYearsBySlug.has(playerSlug(player))) return false;
    if (chips.has("debutants") && !debutants.has(String(player.id))) return false;
    if (chips.has("mine") && !favorites.includes(player.id)) return false;
    return true;
  });

  return (
    <Container className="flex flex-col gap-6 py-12 sm:py-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          aria-expanded={filtersOpen}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-white px-4 text-sm font-medium"
        >
          {filtersOpen ? "Hide filters" : "Show filters"}
          {filtersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <div className="flex h-10 w-full items-center gap-2 rounded-full border border-border bg-white px-4 sm:w-80">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Player name or nationality"
            className="w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          ) : (
            <Search className="h-4 w-4 shrink-0 text-[#2269AB]" aria-hidden="true" />
          )}
        </div>
      </div>

      {filtersOpen ? (
        <div className="flex flex-wrap items-center gap-2">
          {CHIPS.map((chip) => {
            const on = chips.has(chip.id);
            return (
              <button
                key={chip.id}
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => toggleChip(chip.id)}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-full border bg-white px-3 pr-4 text-sm transition-colors",
                  on ? "border-primary text-primary" : "border-border text-[#43524E] hover:border-primary",
                )}
              >
                <span className={cn("flex h-4 w-4 items-center justify-center border", on ? "border-primary bg-primary text-white" : "border-[#43524E]")}>
                  {on ? <Check className="h-3 w-3" /> : null}
                </span>
                {chip.label}
              </button>
            );
          })}
          <select
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            className="h-10 rounded-full border border-border bg-white px-4 text-sm focus:outline-none"
            aria-label="Filter by country"
          >
            <option value="All">All countries</option>
            {availableCountries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
          <span className="ml-auto text-sm text-muted-foreground">
            {filtered.length} player{filtered.length === 1 ? "" : "s"}
          </span>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 border border-dashed border-border py-16 text-center">
          <p className="font-display text-lg font-bold">No players match</p>
          <p className="text-sm text-muted-foreground">
            {chips.has("mine") && favorites.length === 0 ? "Star players on their tiles to build My players." : "Try a different search, country, or filter."}
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-px bg-[#B9BEC0] sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {filtered.map((player) => {
            const { surname, firstName } = splitSurnameFirst(player.name);
            const years = championYearsBySlug.get(playerSlug(player));
            const fav = hydrated && favorites.includes(player.id);
            return (
              <li key={player.id} className={cn("group relative aspect-[3/4] overflow-hidden bg-primary", years && "ring-2 ring-inset ring-accent")}>
                <Link href={`/players/${playerSlug(player)}`} className="absolute inset-0">
                  <PlaceholderArt
                    label={`${player.name} portrait`}
                    imageUrl={player.photoUrl}
                    tone="slate"
                    fill
                    blendBlack
                    fit="contain-bottom"
                    sizes="(min-width: 1024px) 16vw, (min-width: 768px) 25vw, 50vw"
                    className="transition-transform duration-300 ease-standard group-hover:scale-[1.03]"
                  />
                  <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-primary via-primary/60 to-transparent" aria-hidden="true" />
                  <span className="absolute bottom-3 right-3 text-right text-white">
                    <span className="block font-menu text-[15px] leading-tight">{firstName}</span>
                    <span className="block font-menu text-[18px] font-bold uppercase leading-tight">{surname}</span>
                  </span>
                  <span className="absolute right-3 top-3">
                    <CountryFlag code={player.countryCode} className="h-3.5 w-5" />
                  </span>
                  {years ? (
                    <span className="absolute left-3 top-3 flex flex-col items-start gap-1 text-white">
                      {championLogoUrl ? (
                        <Image src={championLogoUrl} alt="" aria-hidden="true" width={32} height={32} className="h-8 w-8 object-contain" />
                      ) : (
                        <Trophy className="h-6 w-6" aria-hidden="true" />
                      )}
                      {years.map((y) => (
                        <span key={y} className="text-xs font-bold tabular-nums">
                          {y}
                        </span>
                      ))}
                    </span>
                  ) : null}
                </Link>
                <button
                  type="button"
                  onClick={() => toggleFavorite(player.id)}
                  aria-pressed={fav}
                  aria-label={`${fav ? "Remove" : "Add"} ${player.name} ${fav ? "from" : "to"} My players`}
                  className="absolute bottom-3 left-3 z-10 text-white/80 hover:text-accent"
                >
                  <Star className={cn("h-5 w-5", fav && "fill-accent text-accent")} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Container>
  );
}
