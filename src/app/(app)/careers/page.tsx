import type { Metadata } from "next";
import { Compass, HeartHandshake, Trophy } from "lucide-react";

import { PageHero } from "@/components/shared/page-hero";
import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CTASection } from "@/components/shared/cta-section";

export const metadata: Metadata = {
  title: "Careers",
  description: "Work at The Legs Open — year-round and championship week roles.",
};

const VALUES = [
  {
    icon: Trophy,
    title: "Championship standards",
    description: "We hold every role, from turf science to ticketing, to the same standard as the golf itself.",
  },
  {
    icon: Compass,
    title: "Year-round and seasonal",
    description: "A small permanent team is joined by hundreds of seasonal colleagues during championship week.",
  },
  {
    icon: HeartHandshake,
    title: "A team behind the team",
    description: "Every department, on-course and off, works toward the same week each year.",
  },
];

const OPEN_ROLES = [
  { title: "Championship Operations Coordinator", location: "Seabrook", type: "Full-time" },
  { title: "Digital Content Editor", location: "Remote", type: "Full-time" },
  { title: "Volunteer Steward", location: "Seabrook Old Course", type: "Championship week" },
  { title: "Hospitality Team Lead", location: "Seabrook", type: "Seasonal" },
];

export default function CareersPage() {
  return (
    <>
      <PageHero
        eyebrow="Work With Us"
        title="Careers"
        description="From year-round roles to championship-week volunteering, here's how to join the team behind The Legs Open."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Careers" }]}
      />

      <Container className="py-16 sm:py-24">
        <SectionHeading eyebrow="Why work with us" title="Life at The Legs Open" />
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {VALUES.map((value) => (
            <Card key={value.title}>
              <CardHeader>
                <value.icon className="h-6 w-6 text-primary" aria-hidden="true" />
                <CardTitle className="text-base">{value.title}</CardTitle>
                <CardDescription>{value.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </Container>

      <Container className="py-16 sm:py-24">
        <SectionHeading eyebrow="Open Roles" title="Current opportunities" />
        <ul className="mt-10 flex flex-col divide-y divide-border border-y border-border">
          {OPEN_ROLES.map((role) => (
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
        title="Don't see the right role?"
        description="We're always keen to hear from people who love the game and the game's original championship."
        primaryAction={{ label: "Get in touch", href: "/contact" }}
        tone="muted"
      />
    </>
  );
}
