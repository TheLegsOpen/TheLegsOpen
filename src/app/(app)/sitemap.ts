import type { MetadataRoute } from "next";

import { LEGAL_PAGES } from "@/data/legal";
import { PLAYERS } from "@/data/players";
import { playerSlug } from "@/lib/utils";
import { SITE } from "@/constants/site";
import { getArticles } from "@/lib/data/articles";
import { getVenues } from "@/lib/data/venues";
import { getChampionshipHistory } from "@/lib/data/championships";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [ARTICLES, VENUES, CHAMPIONSHIP_HISTORY] = await Promise.all([
    getArticles(),
    getVenues(),
    getChampionshipHistory(),
  ]);
  const staticRoutes = [
    "",
    "/leaderboard",
    "/tee-times",
    "/statistics",
    "/venues",
    "/field",
    "/previous-opens",
    "/latest",
    "/club",
    "/shop",
    "/contact",
    "/media",
    "/patrons-and-suppliers",
    "/careers",
  ].map((path) => ({
    url: `${SITE.url}${path}`,
    lastModified: new Date(),
  }));

  const articleRoutes = ARTICLES.map((article) => ({
    url: `${SITE.url}/latest/${article.slug}`,
    lastModified: article.publishedAt,
  }));

  const venueRoutes = VENUES.map((venue) => ({
    url: `${SITE.url}/venues/${venue.slug}`,
    lastModified: new Date(),
  }));

  const playerRoutes = PLAYERS.map((player) => ({
    url: `${SITE.url}/players/${playerSlug(player)}`,
    lastModified: new Date(),
  }));

  const previousOpenRoutes = CHAMPIONSHIP_HISTORY.map((c) => ({
    url: `${SITE.url}/previous-opens/${c.year}`,
    lastModified: new Date(),
  }));

  const legalRoutes = LEGAL_PAGES.map((page) => ({
    url: `${SITE.url}/legal/${page.slug}`,
    lastModified: page.updated,
  }));

  return [
    ...staticRoutes,
    ...articleRoutes,
    ...venueRoutes,
    ...playerRoutes,
    ...previousOpenRoutes,
    ...legalRoutes,
  ];
}
