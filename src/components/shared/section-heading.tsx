import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
  tone?: "light" | "dark";
  /**
   * "display" (default) is the 28px rule-underlined heading this has always been. "label" is the
   * quiet 14/700 uppercase line The Open puts above a list, which leaves the items beneath it as
   * the loudest thing on the page rather than competing with them.
   *
   * Opt-in, so the five other places using this keep what they have. Same arrangement as
   * PageHero's titleClassName: if the quiet label turns out to be right everywhere, it becomes
   * the default and this goes.
   */
  size?: "display" | "label";
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
  tone = "light",
  size = "display",
}: SectionHeadingProps) {
  const isDark = tone === "dark";
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      {eyebrow ? (
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
          {eyebrow}
        </span>
      ) : null}
      <h2
        className={cn(
          size === "label"
            ? "font-menu text-[14px] font-bold uppercase leading-[16.1px] tracking-[1.2px]"
            : "w-fit border-b-2 border-accent pb-2 font-display text-[28px] font-semibold uppercase leading-[normal] tracking-[0.672px] text-balance",
          isDark ? "text-white" : "text-foreground",
        )}
      >
        {title}
      </h2>
      {description ? (
        <p
          className={cn(
            "max-w-2xl text-base sm:text-lg",
            isDark ? "text-surface-dark-foreground/70" : "text-muted-foreground",
            align === "center" && "mx-auto",
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
