export interface InfoCard {
  imageUrl?: string;
  tone: "navy" | "gold" | "dusk" | "slate";
  title: string;
  description?: string;
  linkLabel: string;
  linkHref: string;
}

export interface InfoCardGroupSection {
  type: "infoCardGroup";
  id: string;
  eyebrow?: string;
  heading: string;
  cards: InfoCard[];
}

export interface CtaBannerSection {
  type: "ctaBanner";
  id: string;
  eyebrow?: string;
  heading: string;
  description?: string;
  buttonLabel: string;
  buttonHref: string;
  tone: "light" | "dark" | "gold";
}

export interface RichTextSectionData {
  type: "richText";
  id: string;
  heading?: string;
  paragraphs: string[];
}

export type HomepageSection = InfoCardGroupSection | CtaBannerSection | RichTextSectionData;
