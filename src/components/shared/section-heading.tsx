import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
  tone?: "light" | "dark";
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
  tone = "light",
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
      <h2 className="font-display font-bold text-display-md text-balance">{title}</h2>
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
