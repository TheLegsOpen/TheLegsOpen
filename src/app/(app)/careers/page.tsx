import type { Metadata } from "next";

import { PageHero } from "@/components/shared/page-hero";
import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CTASection } from "@/components/shared/cta-section";
import { getCareersPageSettings } from "@/lib/data/careers-page";
import { ICON_MAP } from "@/components/shared/icon-map";

export const metadata: Metadata = {
  title: "Careers",
  description: "Work at The Legs Open — year-round and championship week roles.",
};

export default async function CareersPage() {
  const settings = await getCareersPageSettings();

  return (
    <>
      <PageHero
        eyebrow={settings.heroEyebrow}
        title={settings.heroTitle}
        description={settings.heroDescription}
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Careers" }]}
      />

      <Container className="py-16 sm:py-24">
        <SectionHeading eyebrow={settings.valuesEyebrow} title={settings.valuesTitle} />
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {settings.values.map((value) => {
            const Icon = ICON_MAP[value.icon];
            return (
              <Card key={value.title}>
                <CardHeader>
                  <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
                  <CardTitle className="text-base">{value.title}</CardTitle>
                  <CardDescription>{value.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </Container>

      <Container className="py-16 sm:py-24">
        <SectionHeading eyebrow={settings.rolesEyebrow} title={settings.rolesTitle} />
        <ul className="mt-10 flex flex-col divide-y divide-border border-y border-border">
          {settings.openRoles.map((role) => (
            <li key={role.title} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-display font-bold">{role.title}</span>
              <span className="text-sm text-muted-foreground">
                {role.location} · {role.type}
              </span>
            </li>
          ))}
        </ul>
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
