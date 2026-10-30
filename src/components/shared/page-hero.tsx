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
  /**
   * Renders in place of `title` when the heading is more than a run of text -- a championship
   * page reads "2026 / Castle Stuart" with the year bold and the slash in the accent, which no
   * single string can carry. `title` is still required and still does the work it always did:
   * the image's alt text and the placeholder's label.
   */
  titleNode?: React.ReactNode;
  /**
   * Replaces the h1's own classes. Opt-in, so the seventeen pages that don't pass it keep the
   * display face they have. This is the narrow version of the sitewide question about whether
   * our hero should take The Open's title treatment everywhere -- when that is settled, what is
   * passed here becomes the default and this prop goes.
   */
  titleClassName?: string;
}

export function PageHero({ eyebrow, title, description, breadcrumbs, variant = "light", size = "large", heightPx, imageLabel, imageUrl, titleNode, titleClassName }: PageHeroProps) {
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
            <h1 className={titleClassName ?? "font-display font-bold text-display-lg text-balance"}>{titleNode ?? title}</h1>
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
          <h1 className={titleClassName ?? "font-display font-bold text-display-lg text-balance text-primary"}>{titleNode ?? title}</h1>
          {description ? (
            <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">{description}</p>
          ) : null}
        </div>
      </Container>
    </section>
  );
}
