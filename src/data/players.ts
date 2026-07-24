import type { Player } from "@/types/player";

type BasePlayer = Omit<Player, "bio">;

const BASE_PLAYERS: BasePlayer[] = [
  { id: "p01", name: "Callum Reith", country: "Scotland", countryCode: "SCO", age: 28, turnedPro: 2019, previousOpens: 6 },
  { id: "p02", name: "Marcus Fennimore", country: "United States", countryCode: "USA", age: 34, turnedPro: 2013, previousOpens: 11 },
  { id: "p03", name: "Tomas Vardebrandt", country: "Sweden", countryCode: "SWE", age: 30, turnedPro: 2016, previousOpens: 7 },
  { id: "p04", name: "Hideto Anzai", country: "Japan", countryCode: "JPN", age: 26, turnedPro: 2020, previousOpens: 3 },
  { id: "p05", name: "Declan O'Farrissey", country: "Ireland", countryCode: "IRL", age: 33, turnedPro: 2014, previousOpens: 9 },
  { id: "p06", name: "Bastien Alcott", country: "France", countryCode: "FRA", age: 29, turnedPro: 2017, previousOpens: 5 },
  { id: "p07", name: "Ryder Costigan", country: "United States", countryCode: "USA", age: 25, turnedPro: 2021, previousOpens: 2 },
  { id: "p08", name: "Niklas Ohrberg", country: "Sweden", countryCode: "SWE", age: 37, turnedPro: 2010, previousOpens: 14 },
  { id: "p09", name: "Amos Kettleworth", country: "England", countryCode: "ENG", age: 31, turnedPro: 2015, previousOpens: 8 },
  { id: "p10", name: "Junsu Baek", country: "South Korea", countryCode: "KOR", age: 24, turnedPro: 2022, previousOpens: 1 },
  { id: "p11", name: "Fergal Muldrennan", country: "Ireland", countryCode: "IRL", age: 36, turnedPro: 2011, previousOpens: 13 },
  { id: "p12", name: "Tyrell Van Aardt", country: "South Africa", countryCode: "RSA", age: 32, turnedPro: 2014, previousOpens: 8 },
  { id: "p13", name: "Wesley Cormac", country: "Australia", countryCode: "AUS", age: 27, turnedPro: 2018, previousOpens: 4 },
  { id: "p14", name: "Rian Delacourt", country: "France", countryCode: "FRA", age: 39, turnedPro: 2008, previousOpens: 16 },
  { id: "p15", name: "Owen Blackthorn", country: "England", countryCode: "ENG", age: 23, turnedPro: 2023, previousOpens: 1 },
  { id: "p16", name: "Santiago Belloir", country: "Spain", countryCode: "ESP", age: 30, turnedPro: 2016, previousOpens: 6 },
  { id: "p17", name: "Magnus Torvik", country: "Norway", countryCode: "NOR", age: 35, turnedPro: 2012, previousOpens: 10 },
  { id: "p18", name: "Cormac Dunleavy", country: "Scotland", countryCode: "SCO", isAmateur: true, age: 19, previousOpens: 1 },
  { id: "p19", name: "Preston Aldergate", country: "United States", countryCode: "USA", age: 41, turnedPro: 2006, previousOpens: 18 },
  { id: "p20", name: "Kaito Nishibe", country: "Japan", countryCode: "JPN", age: 28, turnedPro: 2018, previousOpens: 5 },
];

function buildBio(p: BasePlayer): string[] {
  const firstName = p.name.split(" ")[0];

  if (p.isAmateur) {
    return [
      `${p.name} is competing as an amateur at this year's Legs Open, having earned his place in the field through his performances on the amateur circuit.`,
      `A native of ${p.country}, ${firstName} will be looking to claim the Silver Vase as leading amateur this week.`,
    ];
  }

  const opensLine =
    p.previousOpens === 0
      ? `This is ${firstName}'s first appearance at the Legs Open.`
      : `${firstName} has made ${p.previousOpens} previous ${p.previousOpens === 1 ? "appearance" : "appearances"} at the Legs Open since turning professional in ${p.turnedPro}.`;

  return [
    `${p.name}, ${p.age}, represents ${p.country} on tour. ${opensLine}`,
    `Known for a consistent long game off the tee, ${firstName} arrives at Seabrook aiming to add to his record in the championship.`,
  ];
}

export const PLAYERS: Player[] = BASE_PLAYERS.map((p) => ({ ...p, bio: buildBio(p) }));

export const CURRENT_CHAMPION = {
  player: PLAYERS[0],
  year: 2025,
  venue: "St Brennan's",
  scoreToPar: -14,
  articleSlug: "reith-claims-maiden-legs-open-title",
};
