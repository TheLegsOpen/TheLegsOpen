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

/** Out/In/Total summary row, matching the convention on tour course-stats pages -- par/yardage/scoring-average summed across the range, with per-hole occurrence counts left blank (a "total eagles" figure isn't a meaningful single number the way a summed par or scoring average is). */
function summaryRow(label: string, rows: HoleToughnessRow[]) {
  const holes = rows.filter((r) => r.holeNumber >= (label === "In" ? 10 : 1) && r.holeNumber <= (label === "Out" ? 9 : 18));
  const par = holes.reduce((sum, r) => sum + r.par, 0);
  const yards = holes.every((r) => r.yards !== undefined) ? holes.reduce((sum, r) => sum + (r.yards ?? 0), 0) : undefined;
  const playedHoles = holes.filter((r) => r.average !== undefined);
  const average = playedHoles.length > 0 ? playedHoles.reduce((sum, r) => sum + (r.average ?? 0), 0) : undefined;
  const relative = average !== undefined ? average - holes.filter((r) => r.average !== undefined).reduce((sum, r) => sum + r.par, 0) : undefined;

  return (
    <tr key={label} className="border-b border-surface-dark-foreground/15 bg-surface-dark-foreground/10 font-bold text-surface-dark-foreground last:border-0">
      <td className="px-3 py-2 text-left tabular-nums">—</td>
      <td className="px-3 py-2 text-right tabular-nums">{label}</td>
      <td className="px-3 py-2 text-right tabular-nums">{par}</td>
      <td className="px-3 py-2 text-right tabular-nums">{yards ?? "—"}</td>
      <td className="px-3 py-2 text-right tabular-nums">{formatAverage(average)}</td>
      <td className={cn("px-3 py-2 text-right tabular-nums", relative !== undefined && relative > 0 && "text-[#CB333B]")}>
        {formatRelative(relative)}
      </td>
      <td className="px-3 py-2 text-right tabular-nums">—</td>
      <td className="px-3 py-2 text-right tabular-nums">—</td>
      <td className="px-3 py-2 text-right tabular-nums">—</td>
      <td className="px-3 py-2 text-right tabular-nums">—</td>
      <td className="px-3 py-2 text-right tabular-nums">—</td>
      <td className="px-3 py-2 text-right tabular-nums">—</td>
    </tr>
  );
}

export function ToughestHolesBoard({ title, rows }: { title: string; rows: HoleToughnessRow[] }) {
  return (
    <div className="flex flex-col border border-surface-dark-foreground/15">
      <div className="bg-primary px-4 py-3">
        <h3 className="font-display text-lg font-bold uppercase tracking-wide text-primary-foreground">{title}</h3>
      </div>

      <div className="no-scrollbar overflow-x-auto">
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
            {summaryRow("Out", rows)}
            {summaryRow("In", rows)}
            {summaryRow("Total", rows)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
