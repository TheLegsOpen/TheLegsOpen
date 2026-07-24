import type { Venue } from "@/types/venue";

export const VENUES: Venue[] = [
  {
    slug: "seabrook-old-course",
    name: "Seabrook Old Course",
    location: "Seabrook, Fifeshire",
    region: "East Coast Links",
    parYardage: "Par 72 · 7,305 yards",
    timesHosted: 11,
    firstHosted: 1948,
    lastHosted: 2021,
    description:
      "The spiritual home of The Legs Open, Seabrook's dune-lined fairways and double greens have decided more championships than any other links.",
    overview: [
      "Laid out across a narrow strip of linksland between the town and the bay, Seabrook Old Course rewards players who can flight the ball low under the coastal wind.",
      "The closing stretch runs back along the shoreline, with the 17th's blind approach over gorse regarded as the toughest hole in championship golf.",
      "Seabrook will host the 154th Legs Open, its twelfth staging of the championship.",
    ],
    stats: [
      { label: "Par", value: "72" },
      { label: "Yardage", value: "7,305" },
      { label: "Times hosted", value: "11" },
      { label: "Course record", value: "63" },
    ],
    imageLabel: "Seabrook Old Course, 17th hole",
  },
  {
    slug: "marram-bay-links",
    name: "Marram Bay Links",
    location: "Marram Bay, Northcliffe",
    region: "North Coast Links",
    parYardage: "Par 71 · 7,180 yards",
    timesHosted: 6,
    firstHosted: 1974,
    lastHosted: 2019,
    description:
      "Marram Bay's exposed clifftop holes have produced some of the championship's most dramatic final rounds, with the wind rarely dropping below a stiff breeze.",
    overview: [
      "Perched above the bay, the course's front nine plays along the cliff edge before turning inland through dunes for the closing holes.",
      "The par-3 11th, played across a ravine, is the most photographed hole in the rotation.",
      "Marram Bay returns to the rotation for the 155th Legs Open.",
    ],
    stats: [
      { label: "Par", value: "71" },
      { label: "Yardage", value: "7,180" },
      { label: "Times hosted", value: "6" },
      { label: "Course record", value: "64" },
    ],
    imageLabel: "Marram Bay Links, 11th hole",
  },
  {
    slug: "kirkwall-common",
    name: "Kirkwall Common",
    location: "Kirkwall, Fifeshire",
    region: "East Coast Links",
    parYardage: "Par 70 · 6,995 yards",
    timesHosted: 9,
    firstHosted: 1951,
    lastHosted: 2015,
    description:
      "A tight, old-fashioned links with some of the smallest greens in the rotation, Kirkwall Common places a premium on approach-shot precision.",
    overview: [
      "Kirkwall's greens average under 4,000 square feet, less than half the size of a modern championship green.",
      "The short par-4 8th has yielded more eagles than any hole in championship history.",
    ],
    stats: [
      { label: "Par", value: "70" },
      { label: "Yardage", value: "6,995" },
      { label: "Times hosted", value: "9" },
      { label: "Course record", value: "62" },
    ],
    imageLabel: "Kirkwall Common, 8th green",
  },
  {
    slug: "west-haven-links",
    name: "West Haven Links",
    location: "West Haven, Dunmore",
    region: "West Coast Links",
    parYardage: "Par 72 · 7,412 yards",
    timesHosted: 4,
    firstHosted: 1986,
    lastHosted: 2012,
    description:
      "The longest course in the rotation, West Haven demands power off the tee and a deft touch on some of the firmest greens in golf.",
    overview: [
      "West Haven's back nine plays into the prevailing wind, turning it into one of the most demanding closing stretches in the game.",
      "The par-5 14th has been reachable in two only a handful of times in championship history.",
    ],
    stats: [
      { label: "Par", value: "72" },
      { label: "Yardage", value: "7,412" },
      { label: "Times hosted", value: "4" },
      { label: "Course record", value: "65" },
    ],
    imageLabel: "West Haven Links, 14th fairway",
  },
  {
    slug: "st-brennans",
    name: "St Brennan's",
    location: "St Brennan's, Fifeshire",
    region: "East Coast Links",
    parYardage: "Par 71 · 7,050 yards",
    timesHosted: 14,
    firstHosted: 1948,
    lastHosted: 2023,
    description:
      "The most-used venue in championship history, St Brennan's undulating fairways and cavernous bunkers are instantly recognisable to golf fans.",
    overview: [
      "St Brennan's has hosted the championship more often than any other course, most recently in 2023.",
      "The Principal's Nose bunker complex on the 16th has been redesigned twice since 1948 to keep pace with modern distances.",
    ],
    stats: [
      { label: "Par", value: "71" },
      { label: "Yardage", value: "7,050" },
      { label: "Times hosted", value: "14" },
      { label: "Course record", value: "62" },
    ],
    imageLabel: "St Brennan's, 16th bunker complex",
  },
  {
    slug: "cormorant-point",
    name: "Cormorant Point",
    location: "Cormorant Point, Northcliffe",
    region: "North Coast Links",
    parYardage: "Par 70 · 6,880 yards",
    timesHosted: 3,
    firstHosted: 1998,
    lastHosted: 2017,
    description:
      "The newest addition to the rotation, Cormorant Point blends traditional links strategy with a handful of dramatic, modern green complexes.",
    overview: [
      "Cormorant Point was added to the rotation in 1998 after a decade-long redesign of its original 1920s routing.",
      "Its finishing hole, a short par-4 played downhill to a green perched above the sea, is considered one of the best closing holes in golf.",
    ],
    stats: [
      { label: "Par", value: "70" },
      { label: "Yardage", value: "6,880" },
      { label: "Times hosted", value: "3" },
      { label: "Course record", value: "64" },
    ],
    imageLabel: "Cormorant Point, 18th green",
  },
];
