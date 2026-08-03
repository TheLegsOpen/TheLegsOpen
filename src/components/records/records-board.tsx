import type { ReactNode } from "react";
import Link from "next/link";

import { CountryFlag } from "@/components/shared/country-flag";
import { formatToPar } from "@/lib/leaderboard";
import type { RecordsData } from "@/lib/data/records";

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-border pt-8 first:border-t-0 first:pt-0">
      <div>
        <h2 className="font-display text-xl font-bold sm:text-2xl">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Empty({ children = "Not yet recorded." }: { children?: ReactNode }) {
  return <p className="text-sm italic text-muted-foreground/70">{children}</p>;
}

function RecordRow({ left, right, sub }: { left: ReactNode; right?: ReactNode; sub?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-border/60 py-2.5 first:border-t-0">
      <div className="flex flex-col">
        <span className="font-medium">{left}</span>
        {sub ? <span className="text-xs text-muted-foreground">{sub}</span> : null}
      </div>
      {right !== undefined ? <span className="shrink-0 font-display font-bold tabular-nums">{right}</span> : null}
    </div>
  );
}

function CategoryGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">{children}</div>;
}

export function RecordsBoard({ records }: { records: RecordsData }) {
  const {
    championsMain,
    championsStableford,
    championsScratch,
    mostVictoriesMain,
    mostVictoriesStableford,
    mostVictoriesScratch,
    largestMargin,
    playoffs,
    wonOnDebut,
    mostAppearancesBeforeFirstVictory,
    threeDecadeChampions,
    ledOutrightAfter9,
    lowestScoreInRound,
    lowestWinningToPar,
    greatestComebackAfter9,
    largestLeadByAnyPlayer,
    mostAppearances,
    lowestRunnerUpTotal,
    oldestChampion,
    youngestChampion,
    oldestCompetitor,
    youngestCompetitor,
    courseHostCounts,
    internationalWinners,
  } = records;

  const repeatMain = mostVictoriesMain.filter((v) => v.count >= 2);
  const repeatStableford = mostVictoriesStableford.filter((v) => v.count >= 2);
  const repeatScratch = mostVictoriesScratch.filter((v) => v.count >= 2);

  return (
    <div className="flex flex-col gap-12">
      <Section title="Champion Golfer Of The Year" description="Every winner of the Main competition.">
        {championsMain.length === 0 ? (
          <Empty>No championships recorded yet.</Empty>
        ) : (
          <div className="flex flex-col">
            {championsMain.map((c) => (
              <RecordRow
                key={c.year}
                left={
                  c.slug ? (
                    <Link href={`/players/${c.slug}`} className="hover:underline">
                      {c.name}
                    </Link>
                  ) : (
                    c.name
                  )
                }
                sub={c.venueName}
                right={c.year}
              />
            ))}
          </div>
        )}
      </Section>

      <Section title="Stableford & Scratch Golfer Of The Year" description="Winners of the other two competitions, where recorded.">
        <CategoryGrid>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Stableford</p>
            {championsStableford.length === 0 ? (
              <Empty />
            ) : (
              championsStableford.map((c) => <RecordRow key={c.year} left={c.name} right={c.year} />)
            )}
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Scratch</p>
            {championsScratch.length === 0 ? (
              <Empty />
            ) : (
              championsScratch.map((c) => <RecordRow key={c.year} left={c.name} right={c.year} />)
            )}
          </div>
        </CategoryGrid>
      </Section>

      <Section title="Most Victories" description="Multiple wins in a single competition.">
        <CategoryGrid>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Main</p>
            {repeatMain.length === 0 ? (
              <Empty>No player has won more than once yet.</Empty>
            ) : (
              repeatMain.map((v) => <RecordRow key={v.name} left={v.name} sub={v.years.join(", ")} right={v.count} />)
            )}
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Stableford</p>
            {repeatStableford.length === 0 ? (
              <Empty />
            ) : (
              repeatStableford.map((v) => <RecordRow key={v.name} left={v.name} sub={v.years.join(", ")} right={v.count} />)
            )}
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Scratch</p>
            {repeatScratch.length === 0 ? (
              <Empty />
            ) : (
              repeatScratch.map((v) => <RecordRow key={v.name} left={v.name} sub={v.years.join(", ")} right={v.count} />)
            )}
          </div>
        </CategoryGrid>
      </Section>

      <Section title="Scoring Records" description="Main competition only.">
        <CategoryGrid>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Lowest score in a round by a champion</p>
            {lowestScoreInRound.length === 0 ? (
              <Empty />
            ) : (
              lowestScoreInRound.map((e) => <RecordRow key={e.year} left={e.name} sub={`${e.venueName} · ${e.year}`} right={e.value} />)
            )}
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Lowest winning total in relation to par</p>
            {lowestWinningToPar.length === 0 ? (
              <Empty />
            ) : (
              lowestWinningToPar.map((e) => (
                <RecordRow key={e.year} left={e.name} sub={`${e.venueName} · ${e.year}`} right={formatToPar(e.value)} />
              ))
            )}
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Lowest total by a runner-up</p>
            {lowestRunnerUpTotal.length === 0 ? (
              <Empty />
            ) : (
              lowestRunnerUpTotal.map((e) => <RecordRow key={e.year} left={e.name} sub={`${e.venueName} · ${e.year}`} right={e.value} />)
            )}
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Largest margin of victory</p>
            {largestMargin.length === 0 ? (
              <Empty />
            ) : (
              largestMargin.map((e) => (
                <RecordRow key={e.year} left={e.name} sub={`${e.venueName} · ${e.year}`} right={`${e.margin} shot${e.margin === 1 ? "" : "s"}`} />
              ))
            )}
          </div>
        </CategoryGrid>
      </Section>

      <Section title="Milestone Records" description="Main competition only.">
        <CategoryGrid>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Champions who won on debut</p>
            {wonOnDebut.length === 0 ? <Empty /> : wonOnDebut.map((e) => <RecordRow key={e.year} left={e.name} sub={e.venueName} right={e.year} />)}
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Most appearances by a champion before his first victory
            </p>
            {mostAppearancesBeforeFirstVictory.length === 0 ? (
              <Empty />
            ) : (
              mostAppearancesBeforeFirstVictory.map((e) => <RecordRow key={e.year} left={e.name} sub={String(e.year)} right={e.appearances} />)
            )}
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Champions who won in three separate decades</p>
            {threeDecadeChampions.length === 0 ? (
              <Empty>No champion has won across three separate decades yet.</Empty>
            ) : (
              threeDecadeChampions.map((e) => <RecordRow key={e.name} left={e.name} sub={e.years.join(", ")} />)
            )}
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Most appearances in The Legs Open</p>
            {mostAppearances.length === 0 ? (
              <Empty>No appearance history recorded yet.</Empty>
            ) : (
              mostAppearances.map((e) => (
                <RecordRow
                  key={e.name}
                  left={
                    <span className="inline-flex items-center gap-1.5">
                      <CountryFlag code={e.countryCode} className="h-3 w-4" />
                      {e.slug ? (
                        <Link href={`/players/${e.slug}`} className="hover:underline">
                          {e.name}
                        </Link>
                      ) : (
                        e.name
                      )}
                    </span>
                  }
                  right={e.appearances}
                />
              ))
            )}
          </div>
        </CategoryGrid>
      </Section>

      <Section title="In-Round Records" description="Main competition only.">
        <CategoryGrid>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Champions who led outright after 9 holes</p>
            {ledOutrightAfter9.length === 0 ? (
              <Empty />
            ) : (
              ledOutrightAfter9.map((e) => <RecordRow key={e.year} left={e.name} sub={e.venueName} right={e.year} />)
            )}
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Greatest comeback by a champion after 9 holes</p>
            {greatestComebackAfter9.length === 0 ? (
              <Empty />
            ) : (
              greatestComebackAfter9.map((e) => (
                <RecordRow key={e.year} left={e.name} sub={`${e.venueName} · ${e.year}`} right={`${e.deficit} back`} />
              ))
            )}
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Largest lead by any player</p>
            {largestLeadByAnyPlayer.length === 0 ? (
              <Empty />
            ) : (
              largestLeadByAnyPlayer.map((e) => (
                <RecordRow
                  key={`${e.year}-${e.name}`}
                  left={e.name}
                  sub={`${e.venueName} · ${e.year}${e.afterHole ? ` · after hole ${e.afterHole}` : ""}`}
                  right={e.margin}
                />
              ))
            )}
          </div>
        </CategoryGrid>
      </Section>

      <Section title="Age Records">
        <CategoryGrid>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Oldest Legs Open Champion</p>
            {oldestChampion.length === 0 ? <Empty /> : oldestChampion.map((e) => <RecordRow key={e.year} left={e.name} sub={String(e.year)} right={e.age} />)}
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Youngest Legs Open Champion</p>
            {youngestChampion.length === 0 ? (
              <Empty />
            ) : (
              youngestChampion.map((e) => <RecordRow key={e.year} left={e.name} sub={String(e.year)} right={e.age} />)
            )}
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Oldest Competitor</p>
            {oldestCompetitor.length === 0 ? (
              <Empty>No competitor ages recorded yet.</Empty>
            ) : (
              oldestCompetitor.map((e) => (
                <RecordRow
                  key={e.name}
                  left={
                    e.slug ? (
                      <Link href={`/players/${e.slug}`} className="hover:underline">
                        {e.name}
                      </Link>
                    ) : (
                      e.name
                    )
                  }
                  right={e.age}
                />
              ))
            )}
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Youngest Competitor</p>
            {youngestCompetitor.length === 0 ? (
              <Empty>No competitor ages recorded yet.</Empty>
            ) : (
              youngestCompetitor.map((e) => (
                <RecordRow
                  key={e.name}
                  left={
                    e.slug ? (
                      <Link href={`/players/${e.slug}`} className="hover:underline">
                        {e.name}
                      </Link>
                    ) : (
                      e.name
                    )
                  }
                  right={e.age}
                />
              ))
            )}
          </div>
        </CategoryGrid>
      </Section>

      <Section title="Venues & Other Records">
        <CategoryGrid>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Number of times each course has hosted</p>
            {courseHostCounts.length === 0 ? (
              <Empty />
            ) : (
              courseHostCounts.map((e) => <RecordRow key={e.venueName} left={e.venueName} sub={e.years.join(", ")} right={e.count} />)
            )}
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Play-offs at The Legs Open</p>
            {playoffs.length === 0 ? (
              <Empty>No playoff has occurred yet.</Empty>
            ) : (
              playoffs.map((e) => <RecordRow key={e.year} left={e.name} sub={e.venueName} right={e.year} />)
            )}
          </div>
          <div className="sm:col-span-2">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">International winner (outside Scotland)</p>
            {internationalWinners.length === 0 ? (
              <Empty>Every champion so far has come from Scotland.</Empty>
            ) : (
              internationalWinners.map((e) => <RecordRow key={e.year} left={e.name} sub={e.country} right={e.year} />)
            )}
          </div>
        </CategoryGrid>
      </Section>
    </div>
  );
}
