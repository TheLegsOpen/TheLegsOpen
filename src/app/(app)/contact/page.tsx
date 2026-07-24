import type { Metadata } from "next";

import { PageHero } from "@/components/shared/page-hero";
import { Container } from "@/components/shared/container";
import { ContactForm } from "@/components/contact/contact-form";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with The Legs Open ticket office, membership team, or media centre.",
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        title="Contact us"
        description="Questions about tickets, membership or media access? Send us a message."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Contact Us" }]}
      />
      <Container className="max-w-xl py-16 sm:py-24">
        <ContactForm />
      </Container>
    </>
  );
}
