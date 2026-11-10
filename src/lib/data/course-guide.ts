import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { getToughestHoles } from "@/lib/data/scoring-statistics";
import type { ChampionshipWinner } from "@/types/championship";

export interface CourseGuideHole {
  holeNumber: number;
  par: number;
  si?: number;
  yards?: number;
  /** The field's average gross score, pooled over every Legs Open played here. */
  average?: number;
  /** The strokesaver-style hole image, once there is somewhere to upload one. */
  imageUrl?: string;
}

export interface CourseGuide {
  holes: CourseGuideHole[];
  hardest?: number;
  easiest?: number;
  totalPar: number;
  totalYards: number;
  playedCount: number;
}

/**
 * Par, stroke index and yardage for each hole from the venue's Hole Setup, with the field's
 * average gross score per hole pooled over every completed championship played there -- so a
 * course that has hosted twice averages both, rather than showing only the last one.
 */
export async function loadCourseGuide(venueSlug: string, championships: ChampionshipWinner[]): Promise<CourseGuide> {
  const payload = await getPayload({ config: configPromise });
  const raw = await payload.find({ collection: "venues", where: { slug: { equals: venueSlug } }, limit: 1, depth: 0 });
  const holesRaw = (raw.docs[0]?.holes ?? []) as { par: number; yards?: number | null; si?: number | null }[];

  const played = championships.filter((c) => c.completed);
  const perChampionship = await Promise.all(played.map((c) => getToughestHoles("scratch", c.id).catch(() => [])));
  const holes: CourseGuideHole[] = holesRaw.map((h, i) => {
    const averages = perChampionship.map((rows) => rows.find((r) => r.holeNumber === i + 1)?.average).filter((a): a is number => a !== undefined);
    return {
      holeNumber: i + 1,
      par: h.par,
      si: h.si ?? undefined,
      yards: h.yards ?? undefined,
      average: averages.length ? averages.reduce((a, b) => a + b, 0) / averages.length : undefined,
    };
  });

  const scored = holes.filter((h) => h.average !== undefined);
  const overPar = (h: CourseGuideHole) => h.average! - h.par;
  return {
    holes,
    hardest: scored.length ? scored.reduce((a, b) => (overPar(b) > overPar(a) ? b : a)).holeNumber : undefined,
    easiest: scored.length ? scored.reduce((a, b) => (overPar(b) < overPar(a) ? b : a)).holeNumber : undefined,
    totalPar: holes.reduce((s, h) => s + h.par, 0),
    totalYards: holes.reduce((s, h) => s + (h.yards ?? 0), 0),
    playedCount: played.length,
  };
}
