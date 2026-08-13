import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { getSiteTheme } from "@/lib/data/site-theme";

interface Crumb {
  label: string;
  href?: string;
}

export async function Breadcrumbs({ items }: { items: Crumb[] }) {
  const theme = await getSiteTheme();
  if (!theme.showBreadcrumbs) return null;

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.label} className="flex items-center gap-1.5">
              {index > 0 ? <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /> : null}
              {item.href && !isLast ? (
                <Link href={item.href} className="transition-colors hover:text-primary">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isLast ? "page" : undefined} className={isLast ? "text-foreground" : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
