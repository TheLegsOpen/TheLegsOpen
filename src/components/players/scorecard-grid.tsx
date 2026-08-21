import { cn } from "@/lib/utils";
import { TILE_CLASS, NEUTRAL_TILE_CLASS, holeScorePillClass } from "@/components/leaderboard/leaderboard-table";
import type { HoleScore, Competition } from "@/lib/data/scorecards";

const FRONT_NINE = Array.from({ length: 9 }, (_, i) => i);
const BACK_NINE = Array.from({ length: 9 }, (_, i) => i + 9);

/** Everything the grid actually reads -- deliberately narrower than the full CompetitionEntry so callers that only have a player's own holes/score (not a whole leaderboard row) can use it too. */
export interface ScorecardEntry {
  holes: HoleScore[];
  score?: number;
}

function sumHoles(entry: ScorecardEntry, indices: number[]): number | undefined {
  const values = indices.map((i) => entry.holes[i]?.value);
  if (values.some((v) => v === undefined)) return undefined;
  return (values as number[]).reduce((a, b) => a + b, 0);
}

function sumPars(entry: ScorecardEntry, indices: number[]): number {
  return indices.reduce((total, i) => total + (entry.holes[i]?.par ?? 0), 0);
}

/** Never true for Stableford -- a pickup there just scores 0 for that hole, see HoleScore. */
function hasNoReturn(entry: ScorecardEntry, indices: number[]): boolean {
  return indices.some((i) => entry.holes[i]?.noReturn);
}

const NR_TILE_CLASS = "bg-[#B0B0B0] text-[#08325A]";
// A par score also uses #B0B0B0 (holeScorePillClass's relativeToPar === 0 case) -- white keeps an
// individual picked-up hole visually distinct from a par sitting right next to it in this grid.
// The Out/In/Tot summary cells don't have that neighbour, so they keep the grey NR treatment.
const HOLE_NR_TILE_CLASS = "bg-white text-[#08325A]";

/** Front-9/back-9/out/in/total hole-by-hole scorecard grid, colour-coded per hole relative to par. */
export function ScorecardGrid({ entry, competition }: { entry: ScorecardEntry; competition: Competition }) {
  const isStableford = competition === "stableford";
  // holeScorePillClass's eagle/birdie/par/bogey colouring assumes lower-is-better (strokes-to-par),
  // the opposite of Stableford's higher-is-better points -- applying it there paints birdies navy
  // and bogeys red. Matches HoleByHoleTable's own Stableford handling: neutral tile for every value
  // until there's a meaningful Stableford-specific colour scale to replace it with.
  function pillClass(hole: HoleScore | undefined): string {
    if (hole?.value === undefined) return NEUTRAL_TILE_CLASS;
    return isStableford ? NEUTRAL_TILE_CLASS : holeScorePillClass(hole.relative);
  }

  return (
    <div className="no-scrollbar overflow-x-auto border border-surface-dark-foreground/15">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-accent text-center text-xs uppercase tracking-wide text-accent-foreground">
            {FRONT_NINE.map((i) => (
              <th key={i} className="px-0.5 py-1">
                <span className="block">{i + 1}</span>
                <span className="block font-normal normal-case text-accent-foreground/60">{entry.holes[i]?.par}</span>
              </th>
            ))}
            <th className="px-0.5 py-1">
              <span className="block">Out</span>
              <span className="block font-normal normal-case text-accent-foreground/60">{sumPars(entry, FRONT_NINE)}</span>
            </th>
            {BACK_NINE.map((i) => (
              <th key={i} className="px-0.5 py-1">
                <span className="block">{i + 1}</span>
                <span className="block font-normal normal-case text-accent-foreground/60">{entry.holes[i]?.par}</span>
              </th>
            ))}
            <th className="px-0.5 py-1">
              <span className="block">In</span>
              <span className="block font-normal normal-case text-accent-foreground/60">{sumPars(entry, BACK_NINE)}</span>
            </th>
            <th className="px-0.5 py-1">
              <span className="block">Tot</span>
              <span className="block font-normal normal-case text-accent-foreground/60">{sumPars(entry, [...FRONT_NINE, ...BACK_NINE])}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            {FRONT_NINE.map((i) => {
              const hole = entry.holes[i];
              return (
                <td key={i} className="px-0.5 py-1 text-center">
                  <span className={cn(TILE_CLASS, "min-w-0 w-8 px-0", hole?.noReturn ? HOLE_NR_TILE_CLASS : pillClass(hole))}>
                    {hole?.noReturn ? "NR" : (hole?.value ?? "")}
                  </span>
                </td>
              );
            })}
            <td className="px-0.5 py-1 text-center">
              <span className={cn(TILE_CLASS, "min-w-0 w-8 px-0", hasNoReturn(entry, FRONT_NINE) ? NR_TILE_CLASS : NEUTRAL_TILE_CLASS)}>
                {hasNoReturn(entry, FRONT_NINE) ? "NR" : (sumHoles(entry, FRONT_NINE) ?? "—")}
              </span>
            </td>
            {BACK_NINE.map((i) => {
              const hole = entry.holes[i];
              return (
                <td key={i} className="px-0.5 py-1 text-center">
                  <span className={cn(TILE_CLASS, "min-w-0 w-8 px-0", hole?.noReturn ? HOLE_NR_TILE_CLASS : pillClass(hole))}>
                    {hole?.noReturn ? "NR" : (hole?.value ?? "")}
                  </span>
                </td>
              );
            })}
            <td className="px-0.5 py-1 text-center">
              <span className={cn(TILE_CLASS, "min-w-0 w-8 px-0", hasNoReturn(entry, BACK_NINE) ? NR_TILE_CLASS : NEUTRAL_TILE_CLASS)}>
                {hasNoReturn(entry, BACK_NINE) ? "NR" : (sumHoles(entry, BACK_NINE) ?? "—")}
              </span>
            </td>
            <td className="px-0.5 py-1 text-center">
              <span
                className={cn(
                  TILE_CLASS,
                  "min-w-0 w-8 px-0",
                  hasNoReturn(entry, [...FRONT_NINE, ...BACK_NINE]) ? NR_TILE_CLASS : NEUTRAL_TILE_CLASS,
                )}
              >
                {hasNoReturn(entry, [...FRONT_NINE, ...BACK_NINE]) ? "NR" : isStableford ? (entry.score ?? 0) : (entry.score ?? "—")}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
