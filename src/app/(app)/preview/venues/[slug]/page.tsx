import { VenueDetail } from "@/components/venues/venue-detail";

export const dynamic = "force-dynamic";

/** PREVIEW of /venues/[slug] with changes 13, 14, 15, 25 and 29. */
export default async function VenuePreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <VenueDetail slug={slug} preview />;
}
