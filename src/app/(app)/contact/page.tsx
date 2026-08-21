import type { Metadata } from "next";

import { PageHero } from "@/components/shared/page-hero";
import { Container } from "@/components/shared/container";
import { ContactForm } from "@/components/contact/contact-form";
import { getContactPageSettings } from "@/lib/data/contact-page";
import { getSeoSettings } from "@/lib/data/seo-settings";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoSettings();
  return { title: seo.contact.title, description: seo.contact.description };
}

export default async function ContactPage() {
  const settings = await getContactPageSettings();

  return (
    <>
      <PageHero
        eyebrow={settings.heroEyebrow}
        title={settings.heroTitle}
        description={settings.heroDescription}
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Contact Us" }]}
      />
      <Container className="max-w-xl py-16 sm:py-24">
        <ContactForm />
      </Container>
    </>
  );
}
