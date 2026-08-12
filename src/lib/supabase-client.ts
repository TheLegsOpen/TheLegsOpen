import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

/**
 * Lazily-created singleton so every component sharing this tab reuses one websocket connection
 * (Supabase multiplexes channels over it) instead of opening a new one each mount. Returns
 * undefined when the env vars aren't configured OR malformed -- callers must treat realtime as an
 * optional enhancement, never something the page depends on to function. createClient() throws
 * synchronously (uncaught, this crashed the whole page in production once) if the URL isn't a
 * well-formed http(s) URL, so a truthy-but-invalid value has to be caught here too, not just a
 * missing one -- a bad Vercel env var must never be able to take the whole site down.
 */
export function getSupabaseBrowserClient(): SupabaseClient | undefined {
  if (typeof window === "undefined") return undefined;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return undefined;

  if (!client) {
    try {
      client = createClient(url, key);
    } catch (err) {
      console.error("Supabase Realtime disabled: failed to create client", err);
      return undefined;
    }
  }
  return client;
}
