import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

/**
 * Lazily-created singleton so every component sharing this tab reuses one websocket connection
 * (Supabase multiplexes channels over it) instead of opening a new one each mount. Returns
 * undefined when the env vars aren't configured -- callers should treat realtime as an optional
 * enhancement, not something the page depends on to function.
 */
export function getSupabaseBrowserClient(): SupabaseClient | undefined {
  if (typeof window === "undefined") return undefined;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return undefined;

  if (!client) {
    client = createClient(url, key);
  }
  return client;
}
