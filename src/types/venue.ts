export interface VenueStat {
  label: string;
  value: string;
}

export interface VenueGalleryPhoto {
  imageUrl?: string;
  caption?: string;
}

export interface Venue {
  slug: string;
  name: string;
  location: string;
  region: string;
  countryCode?: string;
  country?: string;
  parYardage?: string;
  timesHosted: number;
  firstHosted: number;
  lastHosted: number;
  description: string;
  overview: string[];
  stats: VenueStat[];
  imageLabel: string;
  imageUrl?: string;
  /** Optional, like Player.gallery/featuredArticleSlugs -- keeps the legacy src/data/venues.ts fixture objects (which predate these fields) type-valid. */
  gallery?: VenueGalleryPhoto[];
  featuredArticleSlugs?: string[];
}
