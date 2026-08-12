"use client";

import { useEffect, useRef } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase-client";

/**
 * Calls onNewPost whenever a new live-blog-posts row is inserted for this championship, via
 * Supabase Realtime. Filtered to championship_id (the actual Postgres column -- Payload's API
 * field name "championship" isn't what Realtime's filter syntax matches against) so bulk
 * backdating work on other championships doesn't trigger refetches on a page showing this one.
 * No-ops when championshipId is null or Realtime isn't configured, so pages keep working without it.
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
