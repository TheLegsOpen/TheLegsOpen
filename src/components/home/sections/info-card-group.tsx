"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

import { Container } from "@/components/shared/container";
import { PlaceholderArt } from "@/components/shared/placeholder-art";
import { SectionHeading } from "@/components/shared/section-heading";
import type { InfoCardGroupSection } from "@/types/homepage-section";

export function InfoCardGroup({ section }: { section: InfoCardGroupSection }) {
  return (
    <section className="bg-surface-dark py-16 text-surface-dark-foreground sm:py-24">
      <Container className="flex flex-col gap-10">
        <SectionHeading tone="dark" eyebrow={section.eyebrow} title={section.heading} />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {section.cards.map((card, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
            >
              <Link href={card.linkHref} className="group flex h-full flex-col gap-4 bg-primary p-5">
                <PlaceholderArt label={card.title} imageUrl={card.imageUrl} tone={card.tone} ratio="16/9" />
                <div className="flex flex-1 flex-col justify-between gap-4">
                  <div>
                    <h3 className="font-display font-bold text-lg">{card.title}</h3>
                    {card.description ? <p className="mt-1 text-sm text-primary-foreground/70">{card.description}</p> : null}
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-accent">
                    {card.linkLabel}
                    <ArrowUpRight className="h-4 w-4 transition-transform duration-200 ease-standard group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
