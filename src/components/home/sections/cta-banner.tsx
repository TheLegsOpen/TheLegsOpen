import Link from "next/link";

import { Container } from "@/components/shared/container";
import { cn } from "@/lib/utils";
import type { CtaBannerSection } from "@/types/homepage-section";

const TONE_CLASSES = {
  light: "bg-background text-foreground",
  dark: "bg-surface-dark text-surface-dark-foreground",
  gold: "bg-accent text-accent-foreground",
} as const;

export function CtaBanner({ section }: { section: CtaBannerSection }) {
  const isGold = section.tone === "gold";

  return (
    <section className={cn("py-16 sm:py-24", TONE_CLASSES[section.tone])}>
      <Container className="flex flex-col items-center gap-5 text-center">
        {section.eyebrow ? (
          <span className={cn("text-xs font-semibold uppercase tracking-[0.14em]", isGold ? "text-accent-foreground/70" : "text-accent")}>
            {section.eyebrow}
          </span>
        ) : null}
        <h2 className="font-display font-bold text-display-md text-balance max-w-2xl">{section.heading}</h2>
        {section.description ? (
          <p className={cn("max-w-2xl text-base sm:text-lg", isGold ? "text-accent-foreground/80" : "text-current opacity-80")}>
            {section.description}
          </p>
        ) : null}
        <Link
          href={section.buttonHref}
          className={cn(
            "mt-2 inline-flex items-center justify-center px-6 py-3 text-sm font-bold uppercase tracking-wide transition-colors",
            isGold
              ? "bg-accent-foreground text-accent hover:bg-accent-foreground/90"
              : "bg-accent text-accent-foreground hover:bg-accent/90",
          )}
        >
          {section.buttonLabel}
        </Link>
      </Container>
    </section>
  );
}
