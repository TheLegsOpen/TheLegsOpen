import { VIDEOS } from "@/data/videos";
import type { Video, VideoSeries } from "@/types/video";

/**
 * Data-access seam for the video hub — same rationale as the articles
 * adapter. Whether this ends up backed by WordPress (as a custom post
 * type) or a video platform's API (Vimeo/Mux/YouTube) is a later decision;
 * this module is the only place that would need to change either way.
 */

const SERIES_ORDER: VideoSeries[] = ["Highlights", "Inside The Championship", "Player Interviews"];

export async function getVideos(): Promise<Video[]> {
  return [...VIDEOS].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

export async function getVideosBySeries(): Promise<Array<{ series: VideoSeries; videos: Video[] }>> {
  const all = await getVideos();
  return SERIES_ORDER.map((series) => ({
    series,
    videos: all.filter((video) => video.series === series),
  })).filter((group) => group.videos.length > 0);
}
