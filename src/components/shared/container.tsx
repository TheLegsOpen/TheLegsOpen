import { cn } from "@/lib/utils";

export function Container({
  className,
  as: Tag = "div",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { as?: "div" | "section" | "article" }) {
  return (
    <Tag
      className={cn("mx-auto w-full max-w-container px-5 md:px-[30px] xl:px-[70px]", className)}
      {...props}
    />
  );
}
