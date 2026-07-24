import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function ordinal(value: number): string {
  const remainder10 = value % 10;
  const remainder100 = value % 100;
  if (remainder10 === 1 && remainder100 !== 11) return `${value}st`;
  if (remainder10 === 2 && remainder100 !== 12) return `${value}nd`;
  if (remainder10 === 3 && remainder100 !== 13) return `${value}rd`;
  return `${value}th`;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Pure, dependency-free — deliberately lives here rather than in
 * lib/data/players.ts so client components can import it without dragging
 * that module's server-only Payload/Postgres imports into the client bundle.
 */
export function playerSlug(player: { name: string }): string {
  return slugify(player.name);
}

const SURNAME_PREFIXES = new Set(["van", "von", "der", "de", "la", "le", "du"]);

/**
 * "Callum Reith" -> "REITH, Callum" — the compact leaderboard-row name
 * format. Keeps compound surname prefixes ("Van Aardt", "De Klerk") attached
 * to the surname rather than splitting on the last space alone.
 */
export function surnameFirst(name: string): string {
  const parts = name.trim().split(" ");
  let splitIndex = parts.length - 1;
  while (splitIndex > 0 && SURNAME_PREFIXES.has(parts[splitIndex - 1].toLowerCase())) {
    splitIndex--;
  }
  const surname = parts.slice(splitIndex).join(" ");
  const firstName = parts.slice(0, splitIndex).join(" ");
  return `${surname.toUpperCase()}, ${firstName}`;
}

export function hashSeed(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Seeded PRNG so decorative-but-plausible synthesized data stays stable across server/client renders. */
export function seededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function isHexColor(value: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

/**
 * "#06051E" -> "242 71% 7%" — our Tailwind tokens are consumed as
 * `hsl(var(--primary))`, so admin-editable hex colors need converting to
 * the bare "H S% L%" triplet CSS custom properties expect.
 */
export function hexToHslTriplet(hex: string): string {
  const clean = hex.trim().replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
  }

  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
