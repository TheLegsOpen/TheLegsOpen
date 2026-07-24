import { Container } from "@/components/shared/container";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PlaceholderArt } from "@/components/shared/placeholder-art";

interface Crumb {
  label: string;
  href?: string;
}

interface PageHeroProps {
  eyebrow?: string;
  title: string;
  description?: string;
  breadcrumbs: Crumb[];
  /** "photo" gives landing-style pages the same full-bleed image treatment as the homepage hero. */
  variant?: "light" | "photo";
  imageLabel?: string;
}

export function PageHero({ eyebrow, title, description, breadcrumbs, variant = "light", imageLabel }: PageHeroProps) {
  if (variant === "photo") {
    return (
      <section className="relative h-[60vh] min-h-[420px] w-full overflow-hidden">
        <PlaceholderArt label={imageLabel ?? title} tone="navy" fill />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />

        <Container className="relative z-10 flex h-full flex-col justify-end gap-5 pb-10 text-white sm:pb-14">
          <div className="[&_a]:text-white/70 [&_a:hover]:text-accent [&_span]:text-white">
            <Breadcrumbs items={breadcrumbs} />
          </div>
          <div className="flex flex-col gap-3">
            {eyebrow ? (
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{eyebrow}</span>
            ) : null}
            <h1 className="font-display font-bold text-display-lg text-balance">{title}</h1>
            {description ? <p className="max-w-2xl text-base text-white/85 sm:text-lg">{description}</p> : null}
          </div>
        </Container>
      </section>
    );
  }

  return (
    <section className="border-b-2 border-primary bg-background py-10 sm:py-14">
      <Container className="flex flex-col gap-5">
        <Breadcrumbs items={breadcrumbs} />
        <div className="flex flex-col gap-3">
          {eyebrow ? (
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{eyebrow}</span>
          ) : null}
          <h1 className="font-display font-bold text-display-lg text-balance text-primary">{title}</h1>
          {description ? (
            <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">{description}</p>
          ) : null}
        </div>
      </Container>
    </section>
  );
}
