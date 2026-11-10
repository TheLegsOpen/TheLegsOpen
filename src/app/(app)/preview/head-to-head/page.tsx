import Link from "next/link";

import { Container } from "@/components/shared/container";
import { CountryFlag } from "@/components/shared/country-flag";
import { PlaceholderArt } from "@/components/shared/placeholder-art";
import { getPlayers, getPlayerResults, type PlayerYearResult } from "@/lib/data/players";
import { formatToPar } from "@/lib/leaderboard";
import { cn, playerSlug, splitSurnameFirst } from "@/lib/utils";
import type { Player } from "@/types/player";

export const dynamic = "force-dynamic";

interface Career {
  appearances: number;
  wins: number;
  bestFinish?: string;
  averageNett?: number;
  bestStableford?: number;
  bestGross?: number;
}

function summarise(player: Player, results: PlayerYearResult[]): Career {
  const completed = results.filter((r) => !r.main.noReturn && !r.main.withdrawn);
  const best = completed.length ? completed.reduce((a, b) => (b.position < a.position ? b : a)) : undefined;
  const nett = completed.map((r) => r.main.score).filter((s): s is number => s !== undefined);
  const stableford = results.map((r) => r.stableford?.score).filter((s): s is number => s !== undefined);
  const gross = results.filter((r) => !r.scratch?.noReturn).map((r) => r.scratch?.score).filter((s): s is number => s !== undefined);
  return {
    appearances: player.previousOpens + results.length,
    wins: results.filter((r) => r.finish === "Winner").length,
    bestFinish: best ? `${best.finish === "Winner" ? "1" : best.finish} (${best.year})` : undefined,
    averageNett: nett.length ? nett.reduce((a, b) => a + b, 0) / nett.length : undefined,
    bestStableford: stableford.length ? Math.max(...stableford) : undefined,
    bestGross: gross.length ? Math.min(...gross) : undefined,
  };
}

function finishLabel(r: PlayerYearResult | undefined): string {
  if (!r) return "—";
  if (r.main.withdrawn) return "WD";
  if (r.main.noReturn) return "NR";
  return r.finish === "Winner" ? "1" : r.finish;
}

function PlayerHead({ player }: { player: Player }) {
  const { firstName, surname } = splitSurnameFirst(player.name);
  return (
    <Link href={`/players/${playerSlug(player)}`} className="group flex items-end gap-4">
      <span className="relative h-[120px] w-[100px] shrink-0 overflow-hidden bg-primary">
        <PlaceholderArt label="" imageUrl={player.photoUrl} tone="navy" blendBlack fill fit="contain-bottom" sizes="100px" />
      </span>
      <span>
        <span className="block font-menu text-[18px] leading-tight text-primary">{firstName}</span>
        <span className="flex items-center gap-2 font-menu text-[32px] font-bold uppercase leading-none text-primary group-hover:text-[#2269AB]">
          {surname}
          <CountryFlag code={player.countryCode} className="h-4 w-6" />
        </span>
      </span>
    </Link>
  );
}

/**
 * PREVIEW (26): head-to-head. Pick two players and see their Legs Open careers side by side, then
 * every year they both played with who finished ahead. A plain GET form, so it works without
 * JavaScript and a comparison can be shared as a link (?a=…&b=…).
 */
export default async function HeadToHeadPreview({ searchParams }: { searchParams: Promise<{ a?: string; b?: string }> }) {
  const { a, b } = await searchParams;
  const players = (await getPlayers()).sort((x, y) => x.name.localeCompare(y.name));
  const pa = players.find((p) => playerSlug(p) === a) ?? players.find((p) => p.name === "Mark Alston");
  const pb = players.find((p) => playerSlug(p) === b) ?? players.find((p) => p.name === "Robert Hamilton");

  const [ra, rb] = pa && pb ? await Promise.all([getPlayerResults(pa), getPlayerResults(pb)]) : [[], []];
  const ca = pa ? summarise(pa, ra) : undefined;
  const cb = pb ? summarise(pb, rb) : undefined;
  const years = [...new Set([...ra.map((r) => r.year), ...rb.map((r) => r.year)])].sort((x, y) => y - x);
  const shared = years.filter((y) => ra.some((r) => r.year === y) && rb.some((r) => r.year === y));
  const ahead = (y: number): "a" | "b" | "level" | undefined => {
    const x = ra.find((r) => r.year === y);
    const z = rb.find((r) => r.year === y);
    if (!x || !z) return undefined;
    const xOut = x.main.noReturn || x.main.withdrawn;
    const zOut = z.main.noReturn || z.main.withdrawn;
    if (xOut && zOut) return "level";
    if (xOut) return "b";
    if (zOut) return "a";
    return x.position < z.position ? "a" : z.position < x.position ? "b" : "level";
  };
  const tallyA = shared.filter((y) => ahead(y) === "a").length;
  const tallyB = shared.filter((y) => ahead(y) === "b").length;

  const rows: { label: string; a?: string | number; b?: string | number; better?: "low" | "high" }[] = [
    { label: "Appearances", a: ca?.appearances, b: cb?.appearances, better: "high" },
    { label: "Wins", a: ca?.wins, b: cb?.wins, better: "high" },
    { label: "Best finish", a: ca?.bestFinish, b: cb?.bestFinish },
    { label: "Average nett", a: ca?.averageNett?.toFixed(1), b: cb?.averageNett?.toFixed(1), better: "low" },
    { label: "Best Stableford", a: ca?.bestStableford, b: cb?.bestStableford, better: "high" },
    { label: "Best gross", a: ca?.bestGross, b: cb?.bestGross, better: "low" },
  ];
  const wins = (row: (typeof rows)[number], side: "a" | "b") => {
    if (!row.better || row.a === undefined || row.b === undefined) return false;
    const x = Number(row.a);
    const y = Number(row.b);
    if (x === y) return false;
    return row.better === "high" ? (side === "a" ? x > y : y > x) : side === "a" ? x < y : y < x;
  };

  return (
    <div className="bg-white">
      <Container className="flex flex-col gap-10 py-12">
        <div className="flex flex-col gap-2">
          <h1 className="font-menu text-[40px] leading-tight text-primary">Head-to-head</h1>
          <p className="text-[#43524E]">Two Legs Open careers side by side, and every year they both played.</p>
        </div>

        <form method="get" className="flex flex-wrap items-center gap-3">
          {(["a", "b"] as const).map((key, i) => (
            <select
              key={key}
              name={key}
              defaultValue={i === 0 ? (pa ? playerSlug(pa) : "") : pb ? playerSlug(pb) : ""}
              className="h-10 rounded-full border border-border bg-white px-4 text-sm"
              aria-label={i === 0 ? "First player" : "Second player"}
            >
              {players.map((p) => (
                <option key={p.id} value={playerSlug(p)}>
                  {p.name}
                </option>
              ))}
            </select>
          ))}
          <button type="submit" className="h-10 bg-[#2269AB] px-5 font-sans text-[15px] font-bold uppercase text-white hover:bg-[#1b5689]">
            Compare
          </button>
        </form>

        {pa && pb && ca && cb ? (
          <>
            <div className="grid grid-cols-1 items-end gap-6 border-b border-[#B9BEC0] pb-6 md:grid-cols-[1fr_auto_1fr]">
              <PlayerHead player={pa} />
              <p className="text-center font-menu text-[36px] font-bold tabular-nums text-primary">
                {tallyA} <span className="text-[#B9BEC0]">–</span> {tallyB}
                <span className="block text-[11px] font-normal uppercase tracking-[1.6px] text-[#43524E]">Finished ahead, years both played</span>
              </p>
              <div className="md:justify-self-end">
                <PlayerHead player={pb} />
              </div>
            </div>

            <table className="w-full border-collapse text-sm">
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className="border-b border-[#B9BEC0]">
                    <td className={cn("w-1/3 py-3 font-menu text-[22px] tabular-nums", wins(row, "a") && "font-bold text-[#2269AB]")}>{row.a ?? "—"}</td>
                    <td className="w-1/3 py-3 text-center text-xs font-bold uppercase tracking-[1.6px] text-[#43524E]">{row.label}</td>
                    <td className={cn("w-1/3 py-3 text-right font-menu text-[22px] tabular-nums", wins(row, "b") && "font-bold text-[#2269AB]")}>{row.b ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex flex-col gap-3">
              <h2 className="font-menu text-[14px] font-bold uppercase tracking-[1.6px] text-[#43524E]">Year by year</h2>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-[#F7F7F7] text-xs uppercase tracking-wide text-[#43524E]">
                    <th className="px-3 py-2 text-left">Year</th>
                    <th className="px-3 py-2 text-left">Venue</th>
                    <th className="px-3 py-2 text-center">{pa.name}</th>
                    <th className="px-3 py-2 text-center">{pb.name}</th>
                  </tr>
                </thead>
                <tbody>
                  {years.map((y) => {
                    const x = ra.find((r) => r.year === y);
                    const z = rb.find((r) => r.year === y);
                    const who = ahead(y);
                    return (
                      <tr key={y} className="border-b border-[#E3E6E8]">
                        <td className="px-3 py-2 tabular-nums">{y}</td>
                        <td className="px-3 py-2">{(x ?? z)?.venueName}</td>
                        <td className={cn("px-3 py-2 text-center tabular-nums", who === "a" && "bg-accent/30 font-bold")}>
                          {finishLabel(x)}
                          {x?.main.toPar !== undefined && !x.main.noReturn ? <span className="ml-1 text-xs text-[#43524E]">({formatToPar(x.main.toPar)})</span> : null}
                        </td>
                        <td className={cn("px-3 py-2 text-center tabular-nums", who === "b" && "bg-accent/30 font-bold")}>
                          {finishLabel(z)}
                          {z?.main.toPar !== undefined && !z.main.noReturn ? <span className="ml-1 text-xs text-[#43524E]">({formatToPar(z.main.toPar)})</span> : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </Container>
    </div>
  );
}
