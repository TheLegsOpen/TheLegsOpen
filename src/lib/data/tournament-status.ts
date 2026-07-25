import { getPayload } from "payload";

import configPromise from "@/payload.config";

export async function getCompetitionComplete(): Promise<boolean> {
  const payload = await getPayload({ config: configPromise });
  const settings = await payload.findGlobal({ slug: "tournament-status" });
  return settings.competitionComplete ?? false;
}
