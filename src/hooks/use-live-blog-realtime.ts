"use client";

import { useEffect, useRef } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase-client";

/**
 * Calls onNewPost whenever a new live-blog-posts row is inserted for this championship, via
 * Supabase Realtime. Filtered to championship_id (the actual Postgres column -- Payload's API
 * field name "championship" isn't what Realtime's filter syntax matches against) so bulk
 * backdating work on other championships doesn't trigger refetches on a page showing this one.
 * No-ops when championshipId is null or Realtime isn't configured, so pages keep working without it.
 *
 * A table has to be readable by the `anon` role before Realtime will send anything for it. Since
 * 30 October 2026 Supabase no longer grants that automatically on new tables in `public`, so a
 * table created from then on needs it stated:
 *
 *   grant select on public.your_table to anon;
 *
 * live_blog_posts predates the change and kept its grant, so this hook is unaffected. It matters
 * for any NEW table someone later wants Realtime on, and for a rebuilt database -- a new project,
 * a preview branch or `supabase db reset` recreates every table without grants, and this project
 * has no migrations for a grant to live in. Nothing else here touches the Data API: Payload talks
 * to Postgres directly over a connection string, which these grants do not govern.
 *
 * Worth stating because the failure is silent. Everything below swallows its errors by design, so
 * a missing grant looks like no live updates rather than like an error.
 */
export function useLiveBlogRealtime(championshipId: string | null | undefined, onNewPost: () => void) {
  const onNewPostRef = useRef(onNewPost);
  onNewPostRef.current = onNewPost;

  useEffect(() => {
    if (!championshipId) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    // Realtime is an optional enhancement -- nothing here may ever throw uncaught and take the
    // page down with it (see the comment on getSupabaseBrowserClient for why that's not
    // hypothetical). Any failure here just means the page falls back to no live push.
    try {
      const channel = supabase
        .channel(`live-blog-posts-${championshipId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "live_blog_posts",
            filter: `championship_id=eq.${championshipId}`,
          },
          () => onNewPostRef.current(),
        )
        .subscribe();

      return () => {
        try {
          supabase.removeChannel(channel);
        } catch (err) {
          console.error("Failed to remove live-blog realtime channel", err);
        }
      };
    } catch (err) {
      console.error("Live-blog realtime subscription disabled", err);
      return undefined;
    }
  }, [championshipId]);
}
