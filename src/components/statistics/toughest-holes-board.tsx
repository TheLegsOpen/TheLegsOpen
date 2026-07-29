import { cn } from "@/lib/utils";
import type { HoleToughnessRow } from "@/lib/data/scoring-statistics";

function formatAverage(value?: number): string {
  return value === undefined ? "—" : value.toFixed(3);
}

function formatRelative(value?: number): string {
  if (value === undefined) return "—";
  const rounded = Math.round(value * 1000) / 1000;
  if (rounded === 0) return "0.000";
  const fixed = Math.abs(rounded).toFixed(3);
  return rounded > 0 ? `+${fixed}` : `-${fixed}`;
}

const COLUMNS = ["Rank", "Hole", "Par", "Yards", "Avg", "+/-", "Eagle-", "Birdie", "Par", "Bogey", "Dbl Bogey", "Dbl Bogey+"];

export function ToughestHolesBoard({ title, rows }: { title: string; rows: HoleToughnessRow[] }) {
  return (
    <div className="flex flex-col border border-surface-dark-foreground/15">
      <div className="bg-primary px-4 py-3">
        <h3 className="font-display text-lg font-bold uppercase tracking-wide text-primary-foreground">{title}</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-surface-dark-foreground/15 bg-surface-dark-foreground/5 text-left text-xs uppercase tracking-wide text-surface-dark-foreground/60">
              {COLUMNS.map((col) => (
                <th key={col} className="whitespace-nowrap px-3 py-2 text-right first:text-left">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.holeNumber} className="border-b border-surface-dark-foreground/15 bg-accent/90 text-accent-foreground last:border-0">
                <td className="px-3 py-2 text-left tabular-nums">
                  {row.position ? `${row.tied ? "T" : ""}${row.position}` : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{row.holeNumber}</td>
                <td className="px-3 py-2 text-right tabular-nums">{row.par}</td>
                <td className="px-3 py-2 text-right tabular-nums">{row.yards ?? "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatAverage(row.average)}</td>
                <td
                  className={cn(
                    "px-3 py-2 text-right tabular-nums font-bold",
                    row.relativeToPar !== undefined && row.relativeToPar > 0 && "text-[#CB333B]",
                  )}
                >
                  {formatRelative(row.relativeToPar)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{row.eagleOrBetter}</td>
                <td className="px-3 py-2 text-right tabular-nums">{row.birdie}</td>
                <td className="px-3 py-2 text-right tabular-nums">{row.parCount}</td>
                <td className="px-3 py-2 text-right tabular-nums">{row.bogey}</td>
                <td className="px-3 py-2 text-right tabular-nums">{row.doubleBogey}</td>
                <td className="px-3 py-2 text-right tabular-nums">{row.doubleBogeyPlus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
