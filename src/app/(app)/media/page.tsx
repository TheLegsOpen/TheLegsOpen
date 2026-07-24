import type { Metadata } from "next";
import { FileText, Image as ImageIcon, Mail } from "lucide-react";

import { PageHero } from "@/components/shared/page-hero";
import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CTASection } from "@/components/shared/cta-section";

export const metadata: Metadata = {
  title: "Media Centre",
  description: "Press accreditation, media contacts and resources for The Legs Open.",
};

const RESOURCES = [
  {
    icon: FileText,
    title: "Press accreditation",
    description: "Accreditation for championship week opens six weeks before the first round. Applications are reviewed on a rolling basis.",
  },
  {
    icon: ImageIcon,
    title: "Photography & broadcast",
    description: "Guidelines for accredited photographers and broadcast crews, including access zones and equipment restrictions.",
  },
  {
    icon: Mail,
    title: "Press enquiries",
    description: "For interview requests, quotes or general media enquiries, the press office responds within one working day.",
  },
];

export default function MediaPage() {
  return (
    <>
      <PageHero
        eyebrow="Media Centre"
        title="Press & media"
        description="Accreditation, resources and contacts for journalists and broadcasters covering The Legs Open."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Media Centre" }]}
      />

      <Container className="py-16 sm:py-24">
        <SectionHeading eyebrow="Resources" title="For accredited media" />
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {RESOURCES.map((resource) => (
            <Card key={resource.title}>
              <CardHeader>
                <resource.icon className="h-6 w-6 text-primary" aria-hidden="true" />
                <CardTitle className="text-base">{resource.title}</CardTitle>
                <CardDescription>{resource.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </Container>

      <CTASection
        title="Need to reach the press office?"
        description="Send accreditation requests and media enquiries through our contact form."
        primaryAction={{ label: "Contact us", href: "/contact" }}
        tone="muted"
      />
    </>
  );
}
