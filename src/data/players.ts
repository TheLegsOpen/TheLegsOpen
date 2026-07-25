import type { Player } from "@/types/player";

type BasePlayer = Omit<Player, "bio">;

const BASE_PLAYERS: BasePlayer[] = [
  { id: "p01", name: "Callum Reith", country: "Scotland", countryCode: "SCO", age: 28, previousOpens: 6 },
  { id: "p02", name: "Marcus Fennimore", country: "United States", countryCode: "USA", age: 34, previousOpens: 11 },
  { id: "p03", name: "Tomas Vardebrandt", country: "Sweden", countryCode: "SWE", age: 30, previousOpens: 7 },
  { id: "p04", name: "Hideto Anzai", country: "Japan", countryCode: "JPN", age: 26, previousOpens: 3 },
  { id: "p05", name: "Declan O'Farrissey", country: "Ireland", countryCode: "IRL", age: 33, previousOpens: 9 },
  { id: "p06", name: "Bastien Alcott", country: "France", countryCode: "FRA", age: 29, previousOpens: 5 },
  { id: "p07", name: "Ryder Costigan", country: "United States", countryCode: "USA", age: 25, previousOpens: 2 },
  { id: "p08", name: "Niklas Ohrberg", country: "Sweden", countryCode: "SWE", age: 37, previousOpens: 14 },
  { id: "p09", name: "Amos Kettleworth", country: "England", countryCode: "ENG", age: 31, previousOpens: 8 },
  { id: "p10", name: "Junsu Baek", country: "South Korea", countryCode: "KOR", age: 24, previousOpens: 1 },
  { id: "p11", name: "Fergal Muldrennan", country: "Ireland", countryCode: "IRL", age: 36, previousOpens: 13 },
  { id: "p12", name: "Tyrell Van Aardt", country: "South Africa", countryCode: "RSA", age: 32, previousOpens: 8 },
  { id: "p13", name: "Wesley Cormac", country: "Australia", countryCode: "AUS", age: 27, previousOpens: 4 },
  { id: "p14", name: "Rian Delacourt", country: "France", countryCode: "FRA", age: 39, previousOpens: 16 },
  { id: "p15", name: "Owen Blackthorn", country: "England", countryCode: "ENG", age: 23, previousOpens: 1 },
  { id: "p16", name: "Santiago Belloir", country: "Spain", countryCode: "ESP", age: 30, previousOpens: 6 },
  { id: "p17", name: "Magnus Torvik", country: "Norway", countryCode: "NOR", age: 35, previousOpens: 10 },
  { id: "p18", name: "Cormac Dunleavy", country: "Scotland", countryCode: "SCO", age: 19, previousOpens: 1 },
  { id: "p19", name: "Preston Aldergate", country: "United States", countryCode: "USA", age: 41, previousOpens: 18 },
  { id: "p20", name: "Kaito Nishibe", country: "Japan", countryCode: "JPN", age: 28, previousOpens: 5 },
];

function buildBio(p: BasePlayer): string[] {
  const firstName = p.name.split(" ")[0];

  const opensLine =
    p.previousOpens === 0
      ? `This is ${firstName}'s first appearance at the Legs Open.`
      : `${firstName} has made ${p.previousOpens} previous ${p.previousOpens === 1 ? "appearance" : "appearances"} at the Legs Open.`;

  return [
    `${p.name}, ${p.age}, represents ${p.country} on tour. ${opensLine}`,
    `Known for a consistent long game off the tee, ${firstName} arrives at Seabrook aiming to add to his record in the championship.`,
  ];
}

export const PLAYERS: Player[] = BASE_PLAYERS.map((p) => ({ ...p, bio: buildBio(p) }));
