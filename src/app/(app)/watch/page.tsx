import type { Metadata } from "next";

import { PageHero } from "@/components/shared/page-hero";
import { Container } from "@/components/shared/container";
import { VideoCard } from "@/components/watch/video-card";
import { getVideosBySeries } from "@/lib/data/videos";

export const metadata: Metadata = {
  title: "Watch",
  description: "Highlights, interviews and behind-the-scenes video from The Legs Open.",
};

export default async function WatchPage() {
  const series = await getVideosBySeries();

  return (
    <>
      <PageHero
        variant="photo"
        imageLabel="Broadcast camera on the 18th green"
        eyebrow="Championship Week"
        title="Watch"
        description="Highlights, interviews and behind-the-scenes video from The Legs Open."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Watch" }]}
      />

      <Container className="flex flex-col gap-16 py-16 sm:py-24">
        {series.map(({ series: label, videos }) => (
          <section key={label} className="flex flex-col gap-6">
            <h2 className="font-display font-bold text-display-sm">{label}</h2>
            <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {videos.map((video) => (
                <VideoCard key={video.slug} video={video} />
              ))}
            </div>
          </section>
        ))}
      </Container>
    </>
  );
}
