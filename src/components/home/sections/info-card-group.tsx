"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { motion } from "framer-motion";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";

import { Container } from "@/components/shared/container";
import { PlaceholderArt } from "@/components/shared/placeholder-art";
import { SectionHeading } from "@/components/shared/section-heading";
import type { InfoCardGroupSection } from "@/types/homepage-section";

export function InfoCardGroup({ section }: { section: InfoCardGroupSection }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start", loop: false });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <section className="bg-surface-dark py-16 text-surface-dark-foreground sm:py-24">
      <Container className="flex flex-col gap-10">
        <div className="relative flex w-full flex-col items-center gap-4">
          <SectionHeading tone="dark" eyebrow={section.eyebrow} title={section.heading} align="center" />
          {section.cards.length > 1 ? (
            <div className="flex shrink-0 gap-2 sm:absolute sm:right-0 sm:top-0">
              <button
                type="button"
                aria-label="Previous"
                onClick={() => emblaApi?.scrollPrev()}
                disabled={!canScrollPrev}
                className="flex h-9 w-9 items-center justify-center border border-surface-dark-foreground/20 text-surface-dark-foreground transition-colors hover:border-accent hover:text-accent disabled:opacity-30 disabled:hover:border-surface-dark-foreground/20 disabled:hover:text-surface-dark-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Next"
                onClick={() => emblaApi?.scrollNext()}
                disabled={!canScrollNext}
                className="flex h-9 w-9 items-center justify-center border border-surface-dark-foreground/20 text-surface-dark-foreground transition-colors hover:border-accent hover:text-accent disabled:opacity-30 disabled:hover:border-surface-dark-foreground/20 disabled:hover:text-surface-dark-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>

        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-6">
            {section.cards.map((card, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="min-w-0 flex-[0_0_85%] sm:flex-[0_0_45%] lg:flex-[0_0_31%]"
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
        </div>
      </Container>
    </section>
  );
}
