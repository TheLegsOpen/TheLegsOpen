"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { CATEGORY_META, formatTime, formatDate } from "@/components/live-blog/live-blog-feed";
import type { LiveBlogEntry } from "@/lib/data/live-blog";

const WIDGET_POST_COUNT = 5;

interface LiveBlogWidgetProps {
  entries: LiveBlogEntry[];
}

export function LiveBlogWidget({ entries }: LiveBlogWidgetProps) {
  const top = entries.slice(0, WIDGET_POST_COUNT);

  return (
    <div className="border border-surface-dark-foreground/15">
      <div className="bg-primary px-5 py-3">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-primary-foreground">Live Blog</h2>
      </div>

      {top.length === 0 ? (
        <p className="p-5 text-sm text-surface-dark-foreground/60">Updates will appear here automatically as notable scores come in.</p>
      ) : (
        <div className="flex flex-col">
          {top.map((entry, index) => {
            const meta = CATEGORY_META[entry.category];
            const Icon = meta.icon;
            return (
              <article
                key={entry.id}
                className={cn("border-b border-surface-dark-foreground/15 p-4 last:border-0", index % 2 === 1 && "bg-surface-dark-foreground/[0.03]")}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide", meta.chipClass)}>
                    <Icon className="h-3 w-3" />
                    {meta.label}
                  </span>
                  <span className="text-[11px] text-surface-dark-foreground/50 tabular-nums">
                    {formatTime(entry.postedAt)} · {formatDate(entry.postedAt)}
                  </span>
                </div>
                <h3 className="font-display text-sm font-bold">{entry.headline}</h3>
              </article>
            );
          })}
        </div>
      )}

      <Link
        href="/live-blog"
        className="flex items-center justify-between bg-primary px-5 py-3 text-sm font-bold uppercase tracking-wide text-accent transition-colors hover:text-accent/80"
      >
        Full live blog
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
