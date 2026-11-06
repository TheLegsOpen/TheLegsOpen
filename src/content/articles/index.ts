import { markdown as southerness2016 } from "./2016-southerness";
import { markdown as gullane2018 } from "./2018-gullane";
import { markdown as ladybank2019 } from "./2019-ladybank";
import { markdown as castle2020 } from "./2020-st-andrews-castle";
import { markdown as blairgowrie2021 } from "./2021-blairgowrie";
import { markdown as lochLomond2022 } from "./2022-loch-lomond";
import { markdown as panmure2023 } from "./2023-panmure";
import { markdown as downfield2024 } from "./2024-downfield";
import { markdown as balmedie2025 } from "./2025-balmedie";

/**
 * Championship write-ups authored as Markdown and published through /api/admin-article.
 *
 * They live in the repo rather than being typed into the admin because an article body is a
 * Lexical node tree, not text -- see src/lib/articles/markdown-to-lexical.ts. Keeping the source
 * here means a piece can be drafted, reviewed in a diff and corrected like any other writing,
 * while the published article stays an ordinary Articles document that anyone can edit afterwards.
 *
 * Adding one: write the Markdown in its own file, import it, and add an entry below. The route
 * matches on `slug`, so re-publishing the same slug updates the existing article rather than
 * creating a second copy.
 */

export type ArticleCategory = "Championship News" | "Player Features" | "History" | "Tickets" | "Course Guide";

export interface ArticleSource {
  slug: string;
  title: string;
  /** One-sentence standfirst, shown on cards and under the headline. */
  dek: string;
  category: ArticleCategory;
  /** Dated to the championship it reports, so the site's chronology reads straight. */
  publishedAt: string;
  /** Caption when no image is set, and alt text when one is. */
  heroLabel: string;
  /**
   * The championship this piece reports, matched by year rather than id so the source stays
   * readable and survives a reseeded database.
   *
   * Articles has carried a `championship` relationship since 30 October 2026 and every article on
   * the site had it empty, this route never having set it -- so nothing was actually joined to
   * anything. Set it here and a write-up is linked to its championship on publish.
   */
  championshipYear?: number;
  markdown: string;
}

export const ARTICLE_SOURCES: ArticleSource[] = [
  {
    slug: "2016-southerness-clee-back-to-back",
    title: "Clee goes back-to-back at Southerness",
    dek: "The fourth Legs Open was played in a wind that would have justified calling it off: eleven men started, five returned a card, and David Clee won two titles in an afternoon.",
    category: "Championship News",
    publishedAt: "2016-07-24T12:00:00.000Z",
    heroLabel: "David Clee at Southerness, July 2016",
    championshipYear: 2016,
    markdown: southerness2016,
  },
  {
    // Slug deliberately matches the draft already in the admin, so publishing this updates that
    // article in place rather than leaving a second copy behind. The dek and hero label are the
    // ones written by hand there -- this only replaces the body with a properly converted one.
    slug: "four-men-played-eighteen-holes-for-nothing-rain-takes-the-2018-legs-open-apart",
    title: "Four men played eighteen holes for nothing: rain takes the 2018 Legs Open apart",
    dek: "David Burns Wins Moist Championship",
    category: "Championship News",
    publishedAt: "2018-08-12T12:00:00.000Z",
    heroLabel: "David Burns Wins Moist Championship",
    championshipYear: 2018,
    markdown: gullane2018,
  },
  {
    slug: "forbes-makes-an-eight-at-the-hardest-hole-and-wins-at-ladybank",
    title: "Forbes makes an eight at the hardest hole and wins at Ladybank",
    dek: "Five over par after nine, and the only man in the field to finish under par. The 2019 Legs Open was won on the back nine by the length of one ruined hole.",
    category: "Championship News",
    publishedAt: "2019-08-18T12:00:00.000Z",
    heroLabel: "Bryan Forbes at Ladybank, August 2019",
    championshipYear: 2019,
    markdown: ladybank2019,
  },
  {
    slug: "park-wins-by-seven-at-the-castle-course-without-a-single-birdie",
    title: "Park wins by seven at the Castle Course without a single birdie",
    dek: "Three pars, no birdies, and the largest winning margin in the championship's history — on a day seven of the sixteen starters returned no card at all.",
    category: "Championship News",
    publishedAt: "2020-09-06T12:00:00.000Z",
    heroLabel: "Kevin Park at the Castle Course, September 2020",
    championshipYear: 2020,
    markdown: castle2020,
  },
  {
    slug: "ward-five-behind-at-the-turn-comes-home-in-level-par-at-blairgowrie",
    title: "Ward, five behind at the turn, comes home in level par at Blairgowrie",
    dek: "Nobody in the field could par the first hole. Nick Ward made six there, then played the back nine better than anyone has played a back nine in this championship.",
    category: "Championship News",
    publishedAt: "2021-09-12T12:00:00.000Z",
    heroLabel: "Nick Ward at Blairgowrie, September 2021",
    championshipYear: 2021,
    markdown: blairgowrie2021,
  },
  {
    slug: "swan-wins-at-loch-lomond-with-nine-pars-and-no-birdies",
    title: "Swan wins at Loch Lomond with nine pars and no birdies",
    dek: "The gentlest scoring day in the championship's history, and it was won by the most conservative round on the course — two clear of a four-man tie.",
    category: "Championship News",
    publishedAt: "2022-09-05T12:00:00.000Z",
    heroLabel: "Lloyd Swan at Loch Lomond, September 2022",
    championshipYear: 2022,
    markdown: lochLomond2022,
  },
  {
    slug: "thomas-wins-the-panmure-playoff-howieson-takes-the-stableford",
    title: "Thomas wins the Panmure playoff, Howieson takes the Stableford",
    dek: "Twenty-eight started and fourteen returned a card. Two of them finished on the same nett score by completely different routes, and a short hole only three men could par did most of the damage.",
    category: "Championship News",
    publishedAt: "2023-09-10T12:00:00.000Z",
    heroLabel: "Barry Thomas at Panmure, September 2023",
    championshipYear: 2023,
    markdown: panmure2023,
  },
  {
    slug: "duncan-wins-the-largest-legs-open-yet-by-a-single-stroke",
    title: "Duncan wins the largest Legs Open yet by a single stroke",
    dek: "Thirty-six starters at Downfield, one stroke covering the top three, and two par fours that took two thirds of the field apart.",
    category: "Championship News",
    publishedAt: "2024-09-07T12:00:00.000Z",
    heroLabel: "Andrew Duncan at Downfield, September 2024",
    championshipYear: 2024,
    markdown: downfield2024,
  },
  {
    slug: "duncan-defends-at-balmedie-with-the-best-nine-holes-in-the-championships-history",
    title: "Duncan defends at Balmedie with the best nine holes in the championship's history",
    dek: "An inward 36 in level par, the lowest round of the day by five, and only the second successful defence the Legs Open has seen.",
    category: "Championship News",
    publishedAt: "2025-09-13T12:00:00.000Z",
    heroLabel: "Andrew Duncan at Balmedie, September 2025",
    championshipYear: 2025,
    markdown: balmedie2025,
  },
];

export function findArticleSource(slug: string): ArticleSource | undefined {
  return ARTICLE_SOURCES.find((source) => source.slug === slug);
}
