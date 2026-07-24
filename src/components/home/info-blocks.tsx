"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

import { Container } from "@/components/shared/container";
import { PlaceholderArt } from "@/components/shared/placeholder-art";
import { SectionHeading } from "@/components/shared/section-heading";

const BLOCKS = [
  {
    title: "The Ballot",
    description: "Everything you need to know about applying for tickets to championship week.",
    href: "/tickets-and-hospitality",
    imageLabel: "Grandstands at Seabrook",
    tone: "navy" as const,
  },
  {
    title: "Seabrook, Fifeshire",
    description: "Plan your trip with ticket-inclusive travel and accommodation packages.",
    href: "/tickets-and-hospitality#travel",
    imageLabel: "Seabrook harbour at dusk",
    tone: "dusk" as const,
  },
  {
    title: "The Shop",
    description: "New championship collections from Fairwood, Reidholt and Marlowe & Finch.",
    href: "/shop",
    imageLabel: "Championship apparel collection",
    tone: "gold" as const,
  },
];

export function InfoBlocks() {
  return (
    <section className="bg-surface-dark bg-dashboard-pattern py-16 text-surface-dark-foreground sm:py-24">
      <Container className="flex flex-col gap-10">
        <SectionHeading tone="dark" eyebrow="Key Information" title="What you need to know" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {BLOCKS.map((block, index) => (
            <motion.div
              key={block.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
            >
              <Link href={block.href} className="group flex h-full flex-col gap-4 bg-primary p-5">
                <PlaceholderArt label={block.imageLabel} tone={block.tone} ratio="16/9" />
                <div className="flex flex-1 flex-col justify-between gap-4">
                  <div>
                    <h3 className="font-display font-bold text-lg">{block.title}</h3>
                    <p className="mt-1 text-sm text-primary-foreground/70">{block.description}</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-accent">
                    Read more
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
