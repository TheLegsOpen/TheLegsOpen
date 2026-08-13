import { Container } from "@/components/shared/container";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PlaceholderArt } from "@/components/shared/placeholder-art";
import { cn } from "@/lib/utils";

interface Crumb {
  label: string;
  href?: string;
}

interface PageHeroProps {
  eyebrow?: string;
  title: string;
  description?: string;
  breadcrumbs?: Crumb[];
  /** "photo" gives landing-style pages the same full-bleed image treatment as the homepage hero. */
  variant?: "light" | "photo";
  /** "large" (default) matches the homepage's cinematic hero. "compact" suits data-utility pages people check repeatedly (leaderboard, tee times, statistics) so the actual content sits higher on the page -- matches theopen.com/AIG Women's Open's own leaderboard header proportions. Ignored when `heightPx` is set. */
  size?: "large" | "compact";
  /** Fixed height in pixels, overriding the vh-based `size` presets -- for a page that needs an exact height rather than one scaled to the viewport. */
  heightPx?: number;
  imageLabel?: string;
  imageUrl?: string;
}

export function PageHero({ eyebrow, title, description, breadcrumbs, variant = "light", size = "large", heightPx, imageLabel, imageUrl }: PageHeroProps) {
  if (variant === "photo") {
    return (
      <section
        className={cn(
          "relative w-full overflow-hidden",
          !heightPx && (size === "compact" ? "h-[22vh] min-h-[160px] sm:h-[30vh] sm:min-h-[220px]" : "h-[60vh] min-h-[420px]"),
        )}
        style={heightPx ? { height: heightPx } : undefined}
      >
        <PlaceholderArt label={imageLabel ?? title} imageUrl={imageUrl} tone="navy" fill />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.95)_0%,rgba(0,0,0,0.8)_45%,rgba(0,0,0,0.25)_75%,rgba(0,0,0,0.05)_100%)]" />

        <Container className={cn("relative z-10 flex h-full flex-col justify-end text-white", size === "compact" ? "gap-2 pb-4 sm:gap-5 sm:pb-14" : "gap-5 pb-10 sm:pb-14")}>
          {breadcrumbs?.length ? (
            <div className="[&_a]:text-white/70 [&_a:hover]:text-accent [&_span]:text-white">
              <Breadcrumbs items={breadcrumbs} />
            </div>
          ) : null}
          <div className="flex flex-col gap-3">
            {eyebrow ? (
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{eyebrow}</span>
            ) : null}
            <h1 className="font-display font-bold text-display-lg text-balance">{title}</h1>
            {description ? (
              <p className={cn("max-w-2xl text-base text-white/85 sm:text-lg", size === "compact" && "hidden sm:block")}>{description}</p>
            ) : null}
          </div>
        </Container>
      </section>
    );
  }

  return (
    <section className="border-b-2 border-primary bg-background py-10 sm:py-14">
      <Container className="flex flex-col gap-5">
        {breadcrumbs?.length ? <Breadcrumbs items={breadcrumbs} /> : null}
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
