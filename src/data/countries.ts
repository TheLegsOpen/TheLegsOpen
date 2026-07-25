export interface Country {
  /** Golf/Olympic-style 3-letter code used throughout the app (matches how The Open lists nationalities). */
  code: string;
  name: string;
  /** flag-icons CSS suffix (fi-{flag}) — ISO 3166-1 alpha-2, plus gb-eng/gb-sct/gb-wls/gb-nir for the home nations. */
  flag: string;
}

export const COUNTRIES: Country[] = [
  { code: "ENG", name: "England", flag: "gb-eng" },
  { code: "SCO", name: "Scotland", flag: "gb-sct" },
  { code: "WAL", name: "Wales", flag: "gb-wls" },
  { code: "NIR", name: "Northern Ireland", flag: "gb-nir" },
  { code: "IRL", name: "Ireland", flag: "ie" },
  { code: "USA", name: "United States", flag: "us" },
  { code: "CAN", name: "Canada", flag: "ca" },
  { code: "MEX", name: "Mexico", flag: "mx" },
  { code: "ARG", name: "Argentina", flag: "ar" },
  { code: "CHI", name: "Chile", flag: "cl" },
  { code: "COL", name: "Colombia", flag: "co" },
  { code: "VEN", name: "Venezuela", flag: "ve" },
  { code: "AUS", name: "Australia", flag: "au" },
  { code: "NZL", name: "New Zealand", flag: "nz" },
  { code: "RSA", name: "South Africa", flag: "za" },
  { code: "ZIM", name: "Zimbabwe", flag: "zw" },
  { code: "KEN", name: "Kenya", flag: "ke" },
  { code: "JPN", name: "Japan", flag: "jp" },
  { code: "KOR", name: "South Korea", flag: "kr" },
  { code: "CHN", name: "China", flag: "cn" },
  { code: "TPE", name: "Chinese Taipei", flag: "tw" },
  { code: "IND", name: "India", flag: "in" },
  { code: "THA", name: "Thailand", flag: "th" },
  { code: "PHI", name: "Philippines", flag: "ph" },
  { code: "MAS", name: "Malaysia", flag: "my" },
  { code: "SIN", name: "Singapore", flag: "sg" },
  { code: "FRA", name: "France", flag: "fr" },
  { code: "ESP", name: "Spain", flag: "es" },
  { code: "ITA", name: "Italy", flag: "it" },
  { code: "GER", name: "Germany", flag: "de" },
  { code: "SWE", name: "Sweden", flag: "se" },
  { code: "NOR", name: "Norway", flag: "no" },
  { code: "DEN", name: "Denmark", flag: "dk" },
  { code: "FIN", name: "Finland", flag: "fi" },
  { code: "NED", name: "Netherlands", flag: "nl" },
  { code: "BEL", name: "Belgium", flag: "be" },
  { code: "AUT", name: "Austria", flag: "at" },
  { code: "SUI", name: "Switzerland", flag: "ch" },
  { code: "POR", name: "Portugal", flag: "pt" },
  { code: "POL", name: "Poland", flag: "pl" },
];

export function countryName(code: string | null | undefined): string {
  return COUNTRIES.find((c) => c.code === code)?.name ?? code ?? "";
}

export function countryFlag(code: string | null | undefined): string | undefined {
  return COUNTRIES.find((c) => c.code === code)?.flag;
}
