import { CountryFlag } from "@/components/shared/country-flag";
import { cn, surnameFirst } from "@/lib/utils";
import type { PlayoffResult } from "@/lib/data/playoffs";

function PlayoffCard({ result, onSelectPlayer }: { result: PlayoffResult; onSelectPlayer: (playerId: string) => void }) {
  const hasSteps = result.steps.length > 0;

  return (
    <div className="flex flex-col border border-surface-dark-foreground/15">
      <div className="bg-primary px-4 py-3">
        <h3 className="font-display text-lg font-bold uppercase tracking-wide text-primary-foreground">{result.competitionLabel} Playoff</h3>
        <p className="text-xs text-primary-foreground/70">
          {result.winner
            ? hasSteps
              ? `${result.winner.name} wins on countback.`
              : `${result.winner.name} takes the title.`
            : result.stillTied
              ? "Still level after every tiebreaker — a shared title."
              : "Tiebreak in progress."}
        </p>
      </div>

      {result.ineligible.length > 0 ? (
        <div className="border-b border-surface-dark-foreground/15 bg-surface-dark-foreground/5 px-4 py-3 text-xs text-surface-dark-foreground/70">
          {result.ineligible.map((player) => player.name).join(", ")}{" "}
          {result.ineligible.length === 1 ? "is" : "are"} ineligible for the Stableford title as the Main Championship{" "}
          {result.ineligible.length === 1 ? "winner" : "winners"} — excluded from this tiebreak.
        </div>
      ) : null}

      <div className="flex flex-col gap-3 bg-surface-dark-foreground/5 p-4">
        {result.steps.map((step, index) => (
          <div key={index} className="border border-surface-dark-foreground/15 bg-primary/40 p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-surface-dark-foreground/60">
              {step.label} <span className="font-normal normal-case text-surface-dark-foreground/40">— {step.description}</span>
            </p>
            <div className="flex flex-col gap-1">
              {step.contenders.map((contender) => {
                const survived = step.survivors.some((p) => p.id === contender.player.id);
                return (
                  <div
                    key={contender.player.id}
                    className={cn(
                      "flex items-center justify-between gap-3 px-2 py-1.5",
                      survived ? "bg-accent/90 text-accent-foreground" : "text-surface-dark-foreground/40 line-through",
                    )}
                  >
                    <span className="flex items-center gap-2 text-sm">
                      <CountryFlag code={contender.player.countryCode} className="h-3 w-4" />
                      <button type="button" onClick={() => onSelectPlayer(contender.player.id)} className="hover:underline">
                        {surnameFirst(contender.player.name)}
                      </button>
                    </span>
                    <span className="text-sm font-bold tabular-nums">{contender.display}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PlayoffsBoard({ results, onSelectPlayer }: { results: PlayoffResult[]; onSelectPlayer: (playerId: string) => void }) {
  if (results.length === 0) return null;

  return (
    <div className="flex flex-col gap-8">
      {results.map((result) => (
        <PlayoffCard key={result.competition} result={result} onSelectPlayer={onSelectPlayer} />
      ))}
    </div>
  );
}
