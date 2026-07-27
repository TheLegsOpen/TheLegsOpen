import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { mediaUrl, slugify } from "@/lib/utils";
import { lexicalToPlainParagraphs } from "@/lib/lexical";
import type { Article as PayloadArticle, Championship as PayloadChampionship, Venue as PayloadVenue } from "@/payload-types";
import type { HomepageSection } from "@/types/homepage-section";

/**
 * Data-access seam for the homepage-settings Global — backed by Payload
 * rather than the local CURRENT_CHAMPION / UPCOMING_CHAMPIONSHIPS fixtures.
 */

export interface CurrentChampion {
  winnerName: string;
  venueName: string;
  scoreToPar: number;
  articleSlug: string;
}

export async function getCurrentChampion(): Promise<CurrentChampion> {
  const payload = await getPayload({ config: configPromise });
  const settings = await payload.findGlobal({ slug: "homepage-settings" });

  const championship = settings.currentChampion.championship as PayloadChampionship;
  const article = settings.currentChampion.article as PayloadArticle;
  const venue = championship.venue as PayloadVenue;

  return {
    winnerName: championship.winnerName,
    venueName: venue.name,
    scoreToPar: championship.scoreToPar,
    articleSlug: article.slug ?? slugify(article.title),
  };
}

export async function getHomepageSections(): Promise<HomepageSection[]> {
  const payload = await getPayload({ config: configPromise });
  const settings = await payload.findGlobal({ slug: "homepage-settings" });
  const blocks = settings.sections ?? [];

  return blocks.map((block, index): HomepageSection => {
    const id = block.id ?? String(index);

    if (block.blockType === "infoCardGroup") {
      return {
        type: "infoCardGroup",
        id,
        eyebrow: block.eyebrow ?? undefined,
        heading: block.heading,
        cards: block.cards.map((card) => ({
          imageUrl: mediaUrl(card.image),
          tone: card.tone ?? "navy",
          title: card.title,
          description: card.description ?? undefined,
          linkLabel: card.linkLabel ?? "Read more",
          linkHref: card.linkHref,
        })),
      };
    }

    if (block.blockType === "ctaBanner") {
      return {
        type: "ctaBanner",
        id,
        eyebrow: block.eyebrow ?? undefined,
        heading: block.heading,
        description: block.description ?? undefined,
        buttonLabel: block.buttonLabel,
        buttonHref: block.buttonHref,
        tone: block.tone ?? "dark",
      };
    }

    return {
      type: "richText",
      id,
      heading: block.heading ?? undefined,
      paragraphs: lexicalToPlainParagraphs(block.content),
    };
  });
}
