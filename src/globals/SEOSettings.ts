import type { GlobalConfig } from "payload";

import { revalidateSeoSettings } from "@/lib/revalidate";

/** Every field here is optional and falls back to the site's original built-in copy (see DEFAULTS
 * in lib/data/seo-settings.ts) -- so leaving a field blank never breaks a page's <title> or meta
 * description, it just keeps showing what's already there. Pages driven directly by their own
 * content (a player's name, a venue's name, an article's headline, a specific year or statistic)
 * aren't listed here -- their title already comes from that record, not a fixed page title. */
export const SEOSettings: GlobalConfig = {
  slug: "seo-settings",
  label: "SEO",
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [revalidateSeoSettings],
  },
  admin: {
    description:
      "The browser-tab title and search-engine description for each fixed page on the site. Leave any field blank to keep the site's original wording.",
  },
  fields: [
    {
      type: "collapsible",
      label: "Home",
      fields: [
        { name: "homeTitle", type: "text", label: "Title", defaultValue: "The Legs Open | Golf's original walk down the fairway." },
        {
          name: "homeDescription",
          type: "textarea",
          label: "Description",
          defaultValue:
            "The home of The Legs Open — championship news, tickets & hospitality, tee times, leaderboards and the story of the game's most storied links championship.",
        },
      ],
    },
    {
      type: "collapsible",
      label: "Leaderboard",
      fields: [
        { name: "leaderboardTitle", type: "text", label: "Title", defaultValue: "Leaderboard" },
        {
          name: "leaderboardDescription",
          type: "textarea",
          label: "Description",
          defaultValue: "Live scoring for The Legs Open — Main, Stableford and Scratch competitions.",
        },
      ],
    },
    {
      type: "collapsible",
      label: "Tee Times",
      fields: [
        { name: "teeTimesTitle", type: "text", label: "Title", defaultValue: "Tee Times" },
        {
          name: "teeTimesDescription",
          type: "textarea",
          label: "Description",
          defaultValue: "Round-by-round tee times for The Legs Open at Seabrook Old Course.",
        },
      ],
    },
    {
      type: "collapsible",
      label: "Records & Statistics",
      fields: [
        { name: "recordsTitle", type: "text", label: "Title", defaultValue: "Records & Statistics" },
        {
          name: "recordsDescription",
          type: "textarea",
          label: "Description",
          defaultValue: "Records and statistics from the full history of The Legs Open.",
        },
      ],
    },
    {
      type: "collapsible",
      label: "Statistics",
      fields: [
        { name: "statisticsTitle", type: "text", label: "Title", defaultValue: "Statistics" },
        {
          name: "statisticsDescription",
          type: "textarea",
          label: "Description",
          defaultValue: "Nett and Scratch scoring statistics by hole par for The Legs Open.",
        },
      ],
    },
    {
      type: "collapsible",
      label: "Field",
      fields: [
        { name: "fieldTitle", type: "text", label: "Title", defaultValue: "Field" },
        {
          name: "fieldDescription",
          type: "textarea",
          label: "Description",
          defaultValue: "The full field of players competing at The Legs Open.",
        },
      ],
    },
    {
      type: "collapsible",
      label: "Venues",
      fields: [
        { name: "venuesTitle", type: "text", label: "Title", defaultValue: "Venues" },
        { name: "venuesDescription", type: "textarea", label: "Description", defaultValue: "Every course to have hosted The Legs Open." },
      ],
    },
    {
      type: "collapsible",
      label: "Live Blog",
      fields: [
        { name: "liveBlogTitle", type: "text", label: "Title", defaultValue: "Live Blog" },
        {
          name: "liveBlogDescription",
          type: "textarea",
          label: "Description",
          defaultValue: "Live updates from The Legs Open — birdies, bogeys and lead changes as they happen.",
        },
      ],
    },
    {
      type: "collapsible",
      label: "Latest News",
      fields: [
        { name: "latestTitle", type: "text", label: "Title", defaultValue: "Latest News" },
        {
          name: "latestDescription",
          type: "textarea",
          label: "Description",
          defaultValue: "News, features and the greatest stories from The Legs Open.",
        },
      ],
    },
    {
      type: "collapsible",
      label: "Previous Opens",
      fields: [
        { name: "previousOpensTitle", type: "text", label: "Title", defaultValue: "Previous Opens" },
        {
          name: "previousOpensDescription",
          type: "textarea",
          label: "Description",
          defaultValue: "The full roll of honour for The Legs Open, since 1948.",
        },
      ],
    },
    {
      type: "collapsible",
      label: "The Clubhouse",
      fields: [
        { name: "clubTitle", type: "text", label: "Title", defaultValue: "The Clubhouse" },
        {
          name: "clubDescription",
          type: "textarea",
          label: "Description",
          defaultValue: "Free membership with priority access to news, a members' newsletter, and championship week invitations.",
        },
      ],
    },
    {
      type: "collapsible",
      label: "Patrons & Suppliers",
      fields: [
        { name: "patronsTitle", type: "text", label: "Title", defaultValue: "Patrons & Suppliers" },
        {
          name: "patronsDescription",
          type: "textarea",
          label: "Description",
          defaultValue: "The patrons and official suppliers who support The Legs Open.",
        },
      ],
    },
    {
      type: "collapsible",
      label: "Careers",
      fields: [
        { name: "careersTitle", type: "text", label: "Title", defaultValue: "Careers" },
        {
          name: "careersDescription",
          type: "textarea",
          label: "Description",
          defaultValue: "Work at The Legs Open — year-round and championship week roles.",
        },
      ],
    },
    {
      type: "collapsible",
      label: "Media Centre",
      fields: [
        { name: "mediaTitle", type: "text", label: "Title", defaultValue: "Media Centre" },
        {
          name: "mediaDescription",
          type: "textarea",
          label: "Description",
          defaultValue: "Press accreditation, media contacts and resources for The Legs Open.",
        },
      ],
    },
    {
      type: "collapsible",
      label: "Contact",
      fields: [
        { name: "contactTitle", type: "text", label: "Title", defaultValue: "Contact Us" },
        {
          name: "contactDescription",
          type: "textarea",
          label: "Description",
          defaultValue: "Get in touch with The Legs Open ticket office, membership team, or media centre.",
        },
      ],
    },
  ],
};
