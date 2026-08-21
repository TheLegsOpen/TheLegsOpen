import type { Metadata } from "next";

import { PageHero } from "@/components/shared/page-hero";
import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CTASection } from "@/components/shared/cta-section";
import { getMediaPageSettings } from "@/lib/data/media-page";
import { ICON_MAP } from "@/components/shared/icon-map";
import { getSeoSettings } from "@/lib/data/seo-settings";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoSettings();
  return { title: seo.media.title, description: seo.media.description };
}

export default async function MediaPage() {
  const settings = await getMediaPageSettings();

  return (
    <>
      <PageHero
        eyebrow={settings.heroEyebrow}
        title={settings.heroTitle}
        description={settings.heroDescription}
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Media Centre" }]}
      />

      <Container className="py-16 sm:py-24">
        <SectionHeading eyebrow={settings.resourcesEyebrow} title={settings.resourcesTitle} />
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {settings.resources.map((resource) => {
            const Icon = ICON_MAP[resource.icon];
            return (
              <Card key={resource.title}>
                <CardHeader>
                  <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
                  <CardTitle className="text-base">{resource.title}</CardTitle>
                  <CardDescription>{resource.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </Container>

      <CTASection
        title={settings.ctaTitle}
        description={settings.ctaDescription}
        primaryAction={{ label: settings.ctaButtonLabel, href: "/contact" }}
        tone="muted"
      />
    </>
  );
}
