import { cn, splitSurnameFirst } from "@/lib/utils";
import type { CompetitionEntry } from "@/lib/data/scorecards";

// Stableford-only counterpart to scoreboard-view.tsx's Table, for a practice round's leaderboard
// (see /score/leaderboard) -- no Main/Scratch tabs, since a practice day never has a championship
// to compute those against. Styling deliberately mirrors scoreboard-view.tsx's own tile/table
// classes rather than importing them, for the same reason that file gives: keep this offline-first
// bundle free of extra dependencies.
const TILE_CLASS = "inline-block min-w-[2.75rem] px-2.5 py-1.5 text-sm font-bold tabular-nums border-t-[3px] border-black/15";
const NEUTRAL_TILE = "bg-[#FFD062] text-black";
const NR_TILE = "bg-[#B0B0B0] text-[#08325A]";

function PlayerName({ name }: { name: string }) {
  const { surname, firstName } = splitSurnameFirst(name);
  return (
    <>
      <span className="font-bold">{surname}</span>
      <span className="font-normal">, {firstName}</span>
    </>
  );
}

export function PracticeScoreboardView({ entries }: { entries: CompetitionEntry[] }) {
  if (entries.length === 0) {
    return <p className="py-10 text-center text-base text-primary-foreground/70">No scores yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-foreground/70">Practice Round · Stableford</p>
      <div className="overflow-x-auto border border-primary-foreground/15 bg-primary">
        <table className="w-full border-collapse text-base">
          <thead>
            <tr className="border-b border-primary-foreground/15 bg-primary-foreground/5 text-left text-sm uppercase tracking-wide text-primary-foreground/70">
              <th className="px-2 py-3">Pos</th>
              <th className="px-2 py-3">Player</th>
              <th className="px-2 py-3 text-right">Thru</th>
              <th className="px-2 py-3 text-right">Points</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.player.id} className="bg-accent/90 text-accent-foreground">
                <td className="px-2 py-3 font-bold tabular-nums">
                  {e.tied ? "T" : ""}
                  {e.position}
                </td>
                <td className="px-2 py-3">
                  <PlayerName name={e.player.name} />
                </td>
                <td className="px-2 py-3 text-right">
                  <span className={cn(TILE_CLASS, NEUTRAL_TILE)}>{e.thru}</span>
                </td>
                <td className="px-2 py-3 text-right">
                  <span className={cn(TILE_CLASS, e.noReturn ? NR_TILE : NEUTRAL_TILE)}>{e.score !== undefined ? `${e.score} pts` : "-"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
