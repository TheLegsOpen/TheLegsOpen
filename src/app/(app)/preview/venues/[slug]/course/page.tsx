import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHero } from "@/components/shared/page-hero";
import { Container } from "@/components/shared/container";
import { CourseGuideExplorer } from "@/components/preview/course-guide-explorer";
import { getVenueBySlug } from "@/lib/data/venues";
import { getChampionshipsByVenueSlug } from "@/lib/data/championships";
import { loadCourseGuide } from "@/lib/data/course-guide";

export const dynamic = "force-dynamic";

/**
 * PREVIEW: a venue's course page, after standrews.com's course pages -- the hole-by-hole guide,
 * where the 18 tiles pick which hole's strokesaver image and numbers show underneath.
 */
export default async function CoursePreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const venue = await getVenueBySlug(slug);
  if (!venue) notFound();
  const championships = (await getChampionshipsByVenueSlug(venue.slug)).sort((a, b) => a.year - b.year);
  const guide = await loadCourseGuide(venue.slug, championships);
  const yardage = guide.totalYards ? ` · ${guide.totalYards.toLocaleString("en-GB")} yards` : "";

  return (
    <>
      <PageHero
        variant="photo"
        size="compact"
        imageLabel={venue.imageLabel}
        imageUrl={venue.imageUrl}
        eyebrow="The Course"
        title={venue.name}
        description={venue.parYardage ?? (guide.holes.length ? `Par ${guide.totalPar}${yardage}` : undefined)}
      />
      <div className="bg-[#F7F7F7]">
        <Container className="flex flex-col gap-8 py-12">
          <Link href={`/preview/venues/${venue.slug}`} className="inline-flex w-fit items-center gap-2 text-sm font-medium text-[#2269AB] hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to {venue.name}
          </Link>
          {guide.holes.length > 0 ? (
            <CourseGuideExplorer guide={guide} venueName={venue.name} />
          ) : (
            <p className="text-sm text-[#43524E]">No hole setup has been entered for {venue.name} yet.</p>
          )}
        </Container>
      </div>
    </>
  );
}
