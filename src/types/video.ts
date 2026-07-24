export type VideoSeries = "Highlights" | "Inside The Championship" | "Player Interviews";

export interface Video {
  slug: string;
  title: string;
  series: VideoSeries;
  durationLabel: string;
  publishedAt: string;
  imageLabel: string;
}
