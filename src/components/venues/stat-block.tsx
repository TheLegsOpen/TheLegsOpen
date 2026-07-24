import type { VenueStat } from "@/types/venue";

export function StatBlock({ stats }: { stats: VenueStat[] }) {
  return (
    <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="flex flex-col gap-1 rounded-lg border border-border p-4">
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</dt>
          <dd className="font-display font-bold text-2xl">{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}
