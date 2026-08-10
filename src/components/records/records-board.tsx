import type { ReactNode } from "react";
import Link from "next/link";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CountryFlag } from "@/components/shared/country-flag";
import { formatToPar } from "@/lib/leaderboard";
import { formatAge } from "@/lib/data/records";
import type { RecordsData, ChampionEntry } from "@/lib/data/records";

/** "Carnwath · 65 (-4)" for Main/Scratch, "Carnwath · 40 pts" for Stableford -- venue on its own when the score isn't known yet. */
function championSub(c: ChampionEntry, mode: "toPar" | "points"): string {
  if (c.score === undefined) return c.venueName;
  const scoreLabel = mode === "points" ? `${c.score} pts` : `${c.score} (${formatToPar(c.scoreToPar ?? 0)})`;
  return `${c.venueName} · ${scoreLabel}`;
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 border-t border-border pt-8 first:border-t-0 first:pt-0">
      <div>
        <h2 className="font-display text-xl font-bold sm:text-2xl">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Empty({ children = "Not yet recorded." }: { children?: ReactNode }) {
  return <p className="py-3 text-sm italic text-muted-foreground/70">{children}</p>;
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

/** One collapsible row per stat category, so a page covering 20+ records doesn't force everything open at once. */
function Category({ value, title, count, children }: { value: string; title: string; count: number; children: ReactNode }) {
  return (
    <AccordionItem value={value}>
      <AccordionTrigger className="text-sm font-bold uppercase tracking-wide text-foreground/90 hover:no-underline">
        <span className="flex items-center gap-2">
          {title}
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold normal-case tracking-normal text-muted-foreground">{count}</span>
        </span>
      </AccordionTrigger>
      <AccordionContent>{children}</AccordionContent>
    </AccordionItem>
  );
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
        <Accordion type="multiple">
          <Category value="champion-main" title="Main" count={championsMain.length}>
            {championsMain.length === 0 ? (
              <Empty>No championships recorded yet.</Empty>
            ) : (
              championsMain.map((c) => (
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
                  sub={championSub(c, "toPar")}
                  right={c.year}
                />
              ))
            )}
          </Category>
        </Accordion>
      </Section>

      <Section title="Stableford & Scratch Golfer Of The Year" description="Winners of the other two competitions, where recorded.">
        <Accordion type="multiple">
          <Category value="stableford-winners" title="Stableford" count={championsStableford.length}>
            {championsStableford.length === 0 ? (
              <Empty />
            ) : (
              championsStableford.map((c) => <RecordRow key={c.year} left={c.name} sub={championSub(c, "points")} right={c.year} />)
            )}
          </Category>
          <Category value="scratch-winners" title="Scratch" count={championsScratch.length}>
            {championsScratch.length === 0 ? (
              <Empty />
            ) : (
              championsScratch.map((c) => <RecordRow key={c.year} left={c.name} sub={championSub(c, "toPar")} right={c.year} />)
            )}
          </Category>
        </Accordion>
      </Section>

      <Section title="Most Victories" description="Multiple wins in a single competition.">
        <Accordion type="multiple">
          <Category value="most-victories-main" title="Main" count={repeatMain.length}>
            {repeatMain.length === 0 ? (
              <Empty>No player has won more than once yet.</Empty>
            ) : (
              repeatMain.map((v) => <RecordRow key={v.name} left={v.name} sub={v.years.join(", ")} right={v.count} />)
            )}
          </Category>
          <Category value="most-victories-stableford" title="Stableford" count={repeatStableford.length}>
            {repeatStableford.length === 0 ? (
              <Empty />
            ) : (
              repeatStableford.map((v) => <RecordRow key={v.name} left={v.name} sub={v.years.join(", ")} right={v.count} />)
            )}
          </Category>
          <Category value="most-victories-scratch" title="Scratch" count={repeatScratch.length}>
            {repeatScratch.length === 0 ? (
              <Empty />
            ) : (
              repeatScratch.map((v) => <RecordRow key={v.name} left={v.name} sub={v.years.join(", ")} right={v.count} />)
            )}
          </Category>
        </Accordion>
      </Section>

      <Section title="Scoring Records" description="Main competition only.">
        <Accordion type="multiple">
          <Category value="lowest-round" title="Lowest score in a round by a champion" count={lowestScoreInRound.length}>
            {lowestScoreInRound.length === 0 ? (
              <Empty />
            ) : (
              lowestScoreInRound.map((e) => <RecordRow key={e.year} left={e.name} sub={`${e.venueName} · ${e.year}`} right={e.value} />)
            )}
          </Category>
          <Category value="lowest-to-par" title="Lowest winning total in relation to par" count={lowestWinningToPar.length}>
            {lowestWinningToPar.length === 0 ? (
              <Empty />
            ) : (
              lowestWinningToPar.map((e) => (
                <RecordRow key={e.year} left={e.name} sub={`${e.venueName} · ${e.year}`} right={formatToPar(e.value)} />
              ))
            )}
          </Category>
          <Category value="lowest-runner-up" title="Lowest total by a runner-up" count={lowestRunnerUpTotal.length}>
            {lowestRunnerUpTotal.length === 0 ? (
              <Empty />
            ) : (
              lowestRunnerUpTotal.map((e) => <RecordRow key={e.year} left={e.name} sub={`${e.venueName} · ${e.year}`} right={e.value} />)
            )}
          </Category>
          <Category value="largest-margin" title="Largest margin of victory" count={largestMargin.length}>
            {largestMargin.length === 0 ? (
              <Empty />
            ) : (
              largestMargin.map((e) => (
                <RecordRow key={e.year} left={e.name} sub={`${e.venueName} · ${e.year}`} right={`${e.margin} shot${e.margin === 1 ? "" : "s"}`} />
              ))
            )}
          </Category>
        </Accordion>
      </Section>

      <Section title="Milestone Records" description="Main competition only.">
        <Accordion type="multiple">
          <Category value="won-on-debut" title="Champions who won on debut" count={wonOnDebut.length}>
            {wonOnDebut.length === 0 ? <Empty /> : wonOnDebut.map((e) => <RecordRow key={e.year} left={e.name} sub={e.venueName} right={e.year} />)}
          </Category>
          <Category
            value="appearances-before-victory"
            title="Most appearances by a champion before his first victory"
            count={mostAppearancesBeforeFirstVictory.length}
          >
            {mostAppearancesBeforeFirstVictory.length === 0 ? (
              <Empty />
            ) : (
              mostAppearancesBeforeFirstVictory.map((e) => <RecordRow key={e.year} left={e.name} sub={String(e.year)} right={e.appearances} />)
            )}
          </Category>
          <Category value="three-decades" title="Champions who won in three separate decades" count={threeDecadeChampions.length}>
            {threeDecadeChampions.length === 0 ? (
              <Empty>No champion has won across three separate decades yet.</Empty>
            ) : (
              threeDecadeChampions.map((e) => <RecordRow key={e.name} left={e.name} sub={e.years.join(", ")} />)
            )}
          </Category>
          <Category value="most-appearances" title="Most appearances in The Legs Open" count={mostAppearances.length}>
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
          </Category>
        </Accordion>
      </Section>

      <Section title="In-Round Records" description="Main competition only.">
        <Accordion type="multiple">
          <Category value="led-after-9" title="Champions who led outright after 9 holes" count={ledOutrightAfter9.length}>
            {ledOutrightAfter9.length === 0 ? (
              <Empty />
            ) : (
              ledOutrightAfter9.map((e) => <RecordRow key={e.year} left={e.name} sub={e.venueName} right={e.year} />)
            )}
          </Category>
          <Category value="comeback-after-9" title="Greatest comeback by a champion after 9 holes" count={greatestComebackAfter9.length}>
            {greatestComebackAfter9.length === 0 ? (
              <Empty />
            ) : (
              greatestComebackAfter9.map((e) => (
                <RecordRow key={e.year} left={e.name} sub={`${e.venueName} · ${e.year}`} right={`${e.deficit} back`} />
              ))
            )}
          </Category>
          <Category value="largest-lead" title="Largest lead by any player" count={largestLeadByAnyPlayer.length}>
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
          </Category>
        </Accordion>
      </Section>

      <Section title="Age Records">
        <Accordion type="multiple">
          <Category value="oldest-champion" title="Oldest Legs Open Champion" count={oldestChampion.length}>
            {oldestChampion.length === 0 ? (
              <Empty />
            ) : (
              oldestChampion.map((e) => <RecordRow key={e.year} left={e.name} sub={String(e.year)} right={formatAge(e.age)} />)
            )}
          </Category>
          <Category value="youngest-champion" title="Youngest Legs Open Champion" count={youngestChampion.length}>
            {youngestChampion.length === 0 ? (
              <Empty />
            ) : (
              youngestChampion.map((e) => <RecordRow key={e.year} left={e.name} sub={String(e.year)} right={formatAge(e.age)} />)
            )}
          </Category>
          <Category value="oldest-competitor" title="Oldest Competitor" count={oldestCompetitor.length}>
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
                  right={formatAge(e.age)}
                />
              ))
            )}
          </Category>
          <Category value="youngest-competitor" title="Youngest Competitor" count={youngestCompetitor.length}>
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
                  right={formatAge(e.age)}
                />
              ))
            )}
          </Category>
        </Accordion>
      </Section>

      <Section title="Venues & Other Records">
        <Accordion type="multiple">
          <Category value="course-hosts" title="Number of times each course has hosted" count={courseHostCounts.length}>
            {courseHostCounts.length === 0 ? (
              <Empty />
            ) : (
              courseHostCounts.map((e) => <RecordRow key={e.venueName} left={e.venueName} sub={e.years.join(", ")} right={e.count} />)
            )}
          </Category>
          <Category value="playoffs" title="Play-offs at The Legs Open" count={playoffs.length}>
            {playoffs.length === 0 ? (
              <Empty>No playoff has occurred yet.</Empty>
            ) : (
              playoffs.map((e) => (
                <RecordRow key={e.year} left={e.name} sub={e.result ? `${e.venueName} · ${e.result}` : e.venueName} right={e.year} />
              ))
            )}
          </Category>
          <Category value="international-winner" title="International winner (outside Scotland)" count={internationalWinners.length}>
            {internationalWinners.length === 0 ? (
              <Empty>Every champion so far has come from Scotland.</Empty>
            ) : (
              internationalWinners.map((e) => <RecordRow key={e.year} left={e.name} sub={e.country} right={e.year} />)
            )}
          </Category>
        </Accordion>
      </Section>
    </div>
  );
}
