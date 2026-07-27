export interface VenueStat {
  label: string;
  value: string;
}

export interface Venue {
  slug: string;
  name: string;
  location: string;
  region: string;
  countryCode?: string;
  country?: string;
  parYardage: string;
  timesHosted: number;
  firstHosted: number;
  lastHosted: number;
  description: string;
  overview: string[];
  stats: VenueStat[];
  imageLabel: string;
  imageUrl?: string;
}
