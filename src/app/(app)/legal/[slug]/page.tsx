import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHero } from "@/components/shared/page-hero";
import { Container } from "@/components/shared/container";
import { getLegalPages, getLegalPage } from "@/lib/data/legal";
import { formatDate } from "@/lib/utils";

interface LegalPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const pages = await getLegalPages();
  return pages.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: LegalPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await getLegalPage(slug);
  return page ? { title: page.title } : {};
}

export default async function LegalDetailPage({ params }: LegalPageProps) {
  const { slug } = await params;
  const page = await getLegalPage(slug);
  if (!page) notFound();

  return (
    <>
      <PageHero
        title={page.title}
        description={`Last updated ${formatDate(page.updated)}`}
        breadcrumbs={[{ label: "Home", href: "/" }, { label: page.title }]}
      />
      <Container className="max-w-3xl py-16">
        <div className="flex flex-col gap-5 text-base leading-relaxed text-foreground">
          {page.body.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </Container>
    </>
  );
}
