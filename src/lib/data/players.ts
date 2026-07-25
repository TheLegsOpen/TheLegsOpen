import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { mediaUrl, slugify } from "@/lib/utils";
import { lexicalToPlainParagraphs } from "@/lib/lexical";
import type { Player } from "@/types/player";
import type { Player as PayloadPlayer } from "@/payload-types";

/**
 * Data-access seam for player profiles — now backed by the Players
 * collection in Payload/Postgres rather than local fixtures.
 */

export function mapPlayer(doc: PayloadPlayer): Player {
  return {
    id: doc.id,
    name: doc.name,
    country: doc.country,
    countryCode: doc.countryCode,
    isAmateur: doc.isAmateur ?? undefined,
    age: doc.age,
    turnedPro: doc.turnedPro ?? undefined,
    previousOpens: doc.previousOpens,
    photoUrl: mediaUrl(doc.photo),
    bio: lexicalToPlainParagraphs(doc.bio),
  };
}

export async function getPlayers(): Promise<Player[]> {
  const payload = await getPayload({ config: configPromise });
  const result = await payload.find({ collection: "players", limit: 200, sort: "name" });
  return result.docs.map(mapPlayer);
}

export async function getPlayerBySlug(slug: string): Promise<Player | undefined> {
  const payload = await getPayload({ config: configPromise });
  const result = await payload.find({ collection: "players", where: { slug: { equals: slug } }, limit: 1 });
  return result.docs[0] ? mapPlayer(result.docs[0]) : undefined;
}

export async function getAllPlayerSlugs(): Promise<string[]> {
  const payload = await getPayload({ config: configPromise });
  const result = await payload.find({ collection: "players", limit: 200 });
  return result.docs.map((doc) => doc.slug ?? slugify(doc.name)).filter(Boolean);
}
