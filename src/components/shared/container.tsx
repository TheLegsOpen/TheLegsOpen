import { cn } from "@/lib/utils";

export function Container({
  className,
  as: Tag = "div",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { as?: "div" | "section" | "article" }) {
  return (
    <Tag
      className={cn("mx-auto w-full max-w-container px-4 sm:px-6 lg:px-8", className)}
      {...props}
    />
  );
}
