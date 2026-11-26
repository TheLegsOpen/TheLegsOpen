import { isConcluded } from "@/lib/leaderboard";
import { courseDifficulty, type CourseDifficulty } from "@/lib/course-difficulty";
import { getChampionshipHistory } from "@/lib/data/championships";
import { getCompetitionLeaderboardForChampionshipId } from "@/lib/data/scorecards";

/** Every venue's Toughest Course figures, from each concluded championship's Main (nett) and Scratch (gross). */
export async function getCourseDifficulty(): Promise<Map<string, CourseDifficulty>> {
  const history = (await getChampionshipHistory()).filter((c) => c.completed);
  const championships = await Promise.all(
    history.map(async (c) => {
      const [main, scratch] = await Promise.all([
        getCompetitionLeaderboardForChampionshipId(c.id, "main"),
        getCompetitionLeaderboardForChampionshipId(c.id, "scratch"),
      ]);
      // A year whose scorecards were never finished has no field to average.
      if (!isConcluded(main)) return undefined;
      const played = (entries: typeof main) => entries.filter((e) => e.started && !e.didNotStart);
      return { venueSlug: c.venueSlug, nett: played(main), gross: played(scratch) };
    }),
  );
  return courseDifficulty(championships.filter((c) => c !== undefined));
}
