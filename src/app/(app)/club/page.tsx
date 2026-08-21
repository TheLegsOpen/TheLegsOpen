import type { Metadata } from "next";
import { Star, Newspaper, PartyPopper, Gift } from "lucide-react";

import { PageHero } from "@/components/shared/page-hero";
import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { CTASection } from "@/components/shared/cta-section";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { JoinForm } from "@/components/club/join-form";
import { getSeoSettings } from "@/lib/data/seo-settings";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoSettings();
  return { title: seo.club.title, description: seo.club.description };
}

const BENEFITS = [
  { icon: Star, title: "Priority access", description: "Be first to hear about championship news and events." },
  { icon: Newspaper, title: "Members' newsletter", description: "Monthly stories and course guides, straight to your inbox." },
  { icon: PartyPopper, title: "Championship week invitations", description: "Invitations to member-only events during the championship." },
  { icon: Gift, title: "Shop offers", description: "Early access to new collections and member-only discounts." },
];

export default function ClubPage() {
  return (
    <>
      <PageHero
        variant="photo"
        imageLabel="The Clubhouse terrace at Seabrook"
        eyebrow="Free Membership"
        title="The Clubhouse"
        description="Join for free in a few minutes and get priority access to news and championship week events."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "The Clubhouse" }]}
      />

      <Container className="py-16 sm:py-24">
        <SectionHeading eyebrow="Member Benefits" title="Why join The Clubhouse" align="center" className="mx-auto" />
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((benefit) => (
            <Card key={benefit.title}>
              <CardHeader>
                <benefit.icon className="h-6 w-6 text-primary" aria-hidden="true" />
                <CardTitle className="text-base">{benefit.title}</CardTitle>
                <CardDescription>{benefit.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </Container>

      <Container id="join" className="scroll-mt-20 py-16 sm:py-24">
        <div className="mx-auto flex max-w-md flex-col gap-6 rounded-xl border border-border p-8">
          <div className="flex flex-col gap-2">
            <h2 className="font-display font-bold text-display-sm">Join for free</h2>
            <p className="text-sm text-muted-foreground">Membership is free for anyone aged 16 and over.</p>
          </div>
          <JoinForm />
        </div>
      </Container>

      <CTASection
        title="Ready for championship week?"
        description="Membership takes a few minutes and keeps you close to everything happening at The Legs Open."
        primaryAction={{ label: "Join The Clubhouse", href: "#join" }}
        tone="muted"
      />
    </>
  );
}
