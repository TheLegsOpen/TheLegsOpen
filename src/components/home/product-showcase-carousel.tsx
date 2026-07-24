"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { PlaceholderArt } from "@/components/shared/placeholder-art";
import { cn } from "@/lib/utils";
import { PRODUCTS } from "@/data/products";

export function ProductShowcaseCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start", containScroll: "trimSnaps" });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(true);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    // Embla's own state (canScrollPrev/Next) isn't available until the ref
    // callback runs, so the initial sync has to happen here alongside the
    // "select"/"reInit" subscriptions rather than during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi, onSelect]);

  return (
    <section className="bg-surface-dark bg-dashboard-pattern py-16 text-surface-dark-foreground sm:py-24">
      <Container className="flex flex-col gap-8">
        <div className="flex items-end justify-between gap-6">
          <SectionHeading tone="dark" eyebrow="Shop" title="Championship collections" />
          <div className="hidden shrink-0 gap-2 sm:flex">
            <button
              type="button"
              aria-label="Previous products"
              disabled={!canScrollPrev}
              onClick={() => emblaApi?.scrollPrev()}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border border-surface-dark-foreground/30 transition-colors",
                canScrollPrev ? "hover:border-accent hover:text-accent" : "opacity-40",
              )}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Next products"
              disabled={!canScrollNext}
              onClick={() => emblaApi?.scrollNext()}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground transition-opacity",
                !canScrollNext && "opacity-40",
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="overflow-hidden" ref={emblaRef}>
          <div className="-ml-6 flex">
            {PRODUCTS.map((product) => (
              <Link
                key={product.id}
                href="/shop"
                className="group ml-6 flex min-w-0 shrink-0 grow-0 basis-[72%] flex-col gap-3 sm:basis-[42%] lg:basis-[27%]"
              >
                <PlaceholderArt label={product.imageLabel} tone="slate" ratio="3/4" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-surface-dark-foreground/60">{product.collection}</p>
                  <h3 className="font-medium group-hover:text-accent">{product.name}</h3>
                  <p className="text-sm text-surface-dark-foreground/70">{product.price}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
