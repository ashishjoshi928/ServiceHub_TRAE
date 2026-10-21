import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// When Supabase is not configured, the platform runs in a fully interactive
// "preview mode" against secure, in-memory mock seed data.
export const isPreviewMode = !url || !anonKey;

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (isPreviewMode) {
    throw new Error("Supabase is not configured — running in preview mode.");
  }
  if (!client) {
    client = createClient(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return client;
}