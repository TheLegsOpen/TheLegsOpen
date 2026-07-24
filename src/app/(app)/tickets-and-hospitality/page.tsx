import type { Metadata } from "next";

import { PageHero } from "@/components/shared/page-hero";
import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { Countdown } from "@/components/shared/countdown";
import { PlaceholderArt } from "@/components/shared/placeholder-art";
import { CTASection } from "@/components/shared/cta-section";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SITE } from "@/constants/site";

const BALLOT_CLOSE_DATE = "2026-10-15T17:00:00Z";

export const metadata: Metadata = {
  title: "Tickets & Hospitality",
  description: "Apply for the public ballot, explore hospitality packages, and plan your visit to The Legs Open.",
};

const HOSPITALITY_TIERS = [
  {
    id: "premium",
    name: "Premium Suites",
    description: "Clubhouse-view hospitality with all-day dining and a dedicated concierge.",
    price: "From £595 per day",
  },
  {
    id: "signature",
    name: "Signature Experiences",
    description: "Behind-the-ropes access with a private viewing terrace over the 18th green.",
    price: "From £1,150 per day",
  },
];

export default function TicketsAndHospitalityPage() {
  return (
    <>
      <PageHero
        variant="photo"
        imageLabel="Crowds celebrating at Seabrook Old Course"
        eyebrow={`${SITE.currentChampionshipNumber}th ${SITE.name}`}
        title="Tickets & Hospitality"
        description="Apply for the public ballot, explore hospitality packages, and start planning your visit to Seabrook."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Tickets & Hospitality" }]}
      />

      <Container className="flex flex-col gap-6 py-16 sm:flex-row sm:items-center sm:justify-between sm:py-20">
        <div className="flex flex-col gap-2">
          <h2 className="font-display font-bold text-display-sm">The public ballot is open</h2>
          <p className="max-w-md text-muted-foreground">
            Apply now for daily and weekly grounds passes. One Club members get priority access.
          </p>
        </div>
        <div className="flex flex-col items-start gap-4 rounded-xl bg-primary px-6 py-6 text-primary-foreground sm:items-end">
          <Countdown targetIso={BALLOT_CLOSE_DATE} />
          <Button variant="accent" size="lg">
            Enter the ballot
          </Button>
        </div>
      </Container>

      <Container id="premium" className="scroll-mt-24 py-16 sm:py-20">
        <SectionHeading eyebrow="Hospitality" title="Hospitality packages" description="Two tiers of hospitality, both overlooking Seabrook's closing holes." />
        <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2">
          {HOSPITALITY_TIERS.map((tier) => (
            <Card key={tier.id} id={tier.id} className="scroll-mt-24 overflow-hidden">
              <PlaceholderArt label={`${tier.name} suite`} tone="gold" ratio="16/9" className="rounded-none" />
              <CardHeader>
                <CardTitle>{tier.name}</CardTitle>
                <CardDescription>{tier.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <span className="font-medium">{tier.price}</span>
                <Button variant="outline">Enquire</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </Container>

      <Container id="travel" className="scroll-mt-24 py-16 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="flex flex-col gap-4">
            <SectionHeading eyebrow="Plan your trip" title="Ticket-inclusive travel and accommodation" />
            <p className="text-muted-foreground">
              Bundle your grounds pass with accommodation in Seabrook and the surrounding coastline, plus optional
              rounds on nearby courses in the days before championship week.
            </p>
            <Button asChild className="w-fit">
              <a href="/contact">Speak to the travel team</a>
            </Button>
          </div>
          <PlaceholderArt label="Seabrook harbour accommodation" tone="dusk" ratio="4/3" />
        </div>
      </Container>

      <Container id="accessibility" className="scroll-mt-24 py-16 sm:py-20">
        <SectionHeading eyebrow="Plan your visit" title="Accessibility guide" description="Seabrook Old Course offers accessible viewing platforms, dedicated parking, and an accessible shuttle service across the grounds." />
        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {["Accessible viewing platforms at holes 1, 9 and 18", "Dedicated accessible parking near the East Gate", "Shuttle buggies available across the grounds"].map((item) => (
            <li key={item} className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
              {item}
            </li>
          ))}
        </ul>
      </Container>

      <CTASection
        eyebrow="One Club"
        title="Join for priority ballot access"
        description="Free membership takes a few minutes and gets you early access to the public ballot."
        primaryAction={{ label: "Join The Clubhouse", href: "/club" }}
        secondaryAction={{ label: "Contact the ticket office", href: "/contact" }}
      />
    </>
  );
}
