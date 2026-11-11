import { Container } from "@/components/shared/container";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PlaceholderArt } from "@/components/shared/placeholder-art";
import { cn } from "@/lib/utils";

interface Crumb {
  label: string;
  href?: string;
}

interface PageHeroProps {
  /** CSS object-position for the photo, e.g. "50% 30%" to keep a face in a wide banner. Centre by default. */
  imagePosition?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  breadcrumbs?: Crumb[];
  /** "photo" gives landing-style pages the same full-bleed image treatment as the homepage hero. */
  variant?: "light" | "photo";
  /** "large" (default) matches the homepage's cinematic hero. "compact" suits data-utility pages people check repeatedly (leaderboard, tee times, statistics) so the actual content sits higher on the page -- matches theopen.com/AIG Women's Open's own leaderboard header proportions. Ignored when `heightPx` is set. */
  size?: "large" | "compact" | "slim" | "feature" | "venue";
  /**
   * "bottom" (default) fades the photo to black from the foot up, behind the title. "diagonal" is
   * theopen.com's Previous Opens hero: clear at the top right, deepening to navy at the bottom left
   * (their 221deg gradient, transparent to 40%), so the photo reads left to right instead of having a
   * dark horizon. Phones keep a light fade from the foot, since our title sits on the photo there.
   */
  shade?: "bottom" | "diagonal";
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
  /**
   * Rendered on the photo beneath the title -- the championship-week switcher on Leaderboard, Tee
   * Times and Statistics, which theopen.com sets on the banner itself rather than in a strip below.
   */
  overlay?: React.ReactNode;
}

export function PageHero({ eyebrow, title, description, breadcrumbs, variant = "light", size = "large", heightPx, imageLabel, imageUrl, imagePosition, titleNode, titleClassName, overlay, shade = "bottom" }: PageHeroProps) {
  const slim = size === "slim";
  if (variant === "photo") {
    return (
      <section
        className={cn(
          "relative w-full overflow-hidden",
          // slim: theopen.com's championship-week banner, about 230px of photo with the switcher on it,
          // so the table starts inside the first screen rather than a fold down.
          !heightPx && (slim ? "h-[174px] sm:h-[230px]" : size === "compact" ? "h-[165px] md:h-[338px]" : size === "feature" ? "h-[260px] md:h-[410px] lg:h-[530px]" : size === "venue" ? "h-[280px] md:h-[340px] lg:h-[440px] xl:h-[520px]" : "h-[60vh] min-h-[420px]"),
        )}
        style={heightPx ? { height: heightPx } : undefined}
      >
        {/* Full-bleed, so 100vw is the honest hint. priority because this is the largest
            above-the-fold element on every page that has a photo hero. */}
        <PlaceholderArt label={imageLabel ?? title} imageUrl={imageUrl} tone="navy" fill sizes="100vw" priority position={imagePosition} />
        {shade === "diagonal" ? (
          <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(6,5,30,0.9)_0%,rgba(6,5,30,0.35)_45%,rgba(6,5,30,0)_75%)] sm:bg-[linear-gradient(221deg,rgba(6,5,30,0)_40%,#06051e_100%)]" />
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.95)_0%,rgba(0,0,0,0.8)_45%,rgba(0,0,0,0.25)_75%,rgba(0,0,0,0.05)_100%)]" />
        )}

        <Container className={cn("relative z-10 flex h-full flex-col justify-end text-white", slim ? "gap-3 pb-5 sm:gap-4 sm:pb-6" : size === "compact" ? "gap-2 pb-4 sm:gap-5 sm:pb-14" : "gap-5 pb-10 sm:pb-14")}>
          {breadcrumbs?.length ? (
            <div className="[&_a]:text-white/70 [&_a:hover]:text-accent [&_span]:text-white">
              <Breadcrumbs items={breadcrumbs} />
            </div>
          ) : null}
          <div className="flex flex-col gap-3">
            {eyebrow ? (
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{eyebrow}</span>
            ) : null}
            <h1 className={titleClassName ?? (slim ? "font-display text-[32px] font-bold leading-tight sm:text-[40px]" : "font-display font-bold text-display-lg text-balance")}>{titleNode ?? title}</h1>
            {description ? (
              // Compact heroes always hold room for two lines of description (2 x the 28px
              // text-lg line). The block is bottom-aligned, so without this a description that
              // happens to wrap lifts the title 28px above its siblings: Tee Times' runs to two
              // lines where Leaderboard's and Statistics' fit on one, and its title sat visibly
              // higher than theirs across the three tabs that share this banner.
              <p
                className={cn(
                  "max-w-2xl text-base text-white/85 sm:text-lg",
                  size === "compact" && "hidden sm:block sm:min-h-[3.5rem]",
                  // One line, trimmed: every slim banner then lines up the same, whatever its length.
                  slim && "hidden max-w-3xl truncate sm:block",
                )}
              >
                {description}
              </p>
            ) : null}
          </div>
          {overlay}
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
