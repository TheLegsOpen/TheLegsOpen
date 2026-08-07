"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";

import { Container } from "@/components/shared/container";
import { PlayerCard } from "@/components/field/player-card";
import { CountryFlag } from "@/components/shared/country-flag";
import { COUNTRIES } from "@/data/countries";
import { cn, playerSlug } from "@/lib/utils";
import type { Player } from "@/types/player";
import type { ChampionshipWinner } from "@/types/championship";

type Chip = "all" | "champions" | "debutants";

const CHIPS: { id: Chip; label: string }[] = [
  { id: "all", label: "All" },
  { id: "champions", label: "Past Champions" },
  { id: "debutants", label: "Debutants" },
];

interface FieldViewProps {
  players: Player[];
  championshipHistory: ChampionshipWinner[];
  championLogoUrl?: string;
}

export function FieldView({ players, championshipHistory, championLogoUrl }: FieldViewProps) {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("All");
  const [chip, setChip] = useState<Chip>("all");

  const championYearsBySlug = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const c of championshipHistory) {
      if (!c.winnerPlayerSlug) continue;
      const years = map.get(c.winnerPlayerSlug) ?? [];
      years.push(c.year);
      map.set(c.winnerPlayerSlug, years.sort((a, b) => a - b));
    }
    return map;
  }, [championshipHistory]);

  const championSlugs = useMemo(() => new Set(championYearsBySlug.keys()), [championYearsBySlug]);

  const availableCountries = useMemo(() => {
    const codes = new Set(players.map((p) => p.countryCode));
    return COUNTRIES.filter((c) => codes.has(c.code)).sort((a, b) => a.name.localeCompare(b.name));
  }, [players]);

  const filtered = players.filter((player) => {
    const q = query.trim().toLowerCase();
    if (q && !player.name.toLowerCase().includes(q) && !player.country.toLowerCase().includes(q)) return false;
    if (country !== "All" && player.countryCode !== country) return false;
    if (chip === "champions" && !championSlugs.has(playerSlug(player))) return false;
    if (chip === "debutants" && player.previousOpens !== 0) return false;
    return true;
  });

  return (
    <Container className="flex flex-col gap-8 py-16 sm:py-24">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-10 flex-1 items-center gap-2 rounded-full border border-border px-4 sm:max-w-xs">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Player name or nationality"
            className="w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="text-muted-foreground hover:text-primary">
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <select
          value={country}
          onChange={(event) => setCountry(event.target.value)}
          className="h-10 rounded-full border border-border bg-background px-4 text-sm focus:outline-none"
          aria-label="Filter by country"
        >
          <option value="All">All countries</option>
          {availableCountries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>

        {country !== "All" ? <CountryFlag code={country} className="h-3 w-4" /> : null}

        <div className="flex flex-wrap gap-2">
          {CHIPS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setChip(c.id)}
              aria-pressed={chip === c.id}
              className={cn(
                "h-10 rounded-full border px-4 text-sm font-medium transition-colors",
                chip === c.id ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary hover:text-primary",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} player{filtered.length === 1 ? "" : "s"}
      </p>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
          <p className="font-display text-lg font-bold">No players match</p>
          <p className="text-sm text-muted-foreground">Try a different search, country, or filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
          {filtered.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              championYears={championYearsBySlug.get(playerSlug(player))}
              championLogoUrl={championLogoUrl}
            />
          ))}
        </div>
      )}
    </Container>
  );
}
