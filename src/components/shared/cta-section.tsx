import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/container";
import { cn } from "@/lib/utils";

interface CTASectionProps {
  eyebrow?: string;
  title: string;
  description?: string;
  primaryAction: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
  tone?: "primary" | "muted";
  className?: string;
}

export function CTASection({
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  tone = "primary",
  className,
}: CTASectionProps) {
  return (
    <section
      className={cn(
        "py-16 sm:py-20",
        tone === "primary" ? "bg-primary text-primary-foreground" : "bg-secondary",
        className,
      )}
    >
      <Container className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex max-w-2xl flex-col gap-3">
          {eyebrow ? (
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{eyebrow}</span>
          ) : null}
          <h2 className="font-display font-bold text-display-sm text-balance sm:text-display-md">{title}</h2>
          {description ? (
            <p className={cn("text-base sm:text-lg", tone === "primary" ? "text-primary-foreground/80" : "text-muted-foreground")}>
              {description}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <Button asChild variant="accent" size="lg">
            <Link href={primaryAction.href}>{primaryAction.label}</Link>
          </Button>
          {secondaryAction ? (
            <Button
              asChild
              variant="outline"
              size="lg"
              className={tone === "primary" ? "border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" : undefined}
            >
              <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
            </Button>
          ) : null}
        </div>
      </Container>
    </section>
  );
}
