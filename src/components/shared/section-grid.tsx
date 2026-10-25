import { cn } from "@/lib/utils";

/**
 * The column split a content band uses.
 *
 * The Open builds every band on one primitive -- a grid wrapper with one, two or three column
 * children -- which is why its homepage holds together across a dozen unrelated modules. These are
 * the two proportions it actually uses, measured at 1920: a main column beside a sidebar, and three
 * equal columns. The gutter is 20px in both cases and never varies.
 *
 * `side-main` is the mirror, for a band that wants the narrow column first.
 */
const LAYOUTS = {
  "main-side": "lg:grid-cols-main-side",
  "side-main": "lg:grid-cols-side-main",
  thirds: "lg:grid-cols-thirds",
} as const;

export type SectionGridLayout = keyof typeof LAYOUTS;

/**
 * Splits a band into columns at `lg` and above, stacking below it.
 *
 * Bands used to carry their own grid classes, which meant every new section re-decided both the
 * split and the gutter -- the homepage was on a 50/50 split at a 40px gap while the rest of the
 * site used neither. Going through this keeps that decision in one place, so a band chooses a
 * named proportion rather than inventing one.
 */
export function SectionGrid({
  layout = "thirds",
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { layout?: SectionGridLayout }) {
  return <div className={cn("grid grid-cols-1 gap-5", LAYOUTS[layout], className)} {...props} />;
}
