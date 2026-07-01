"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True when the Supabase auth keys are configured. Login is unavailable otherwise. */
export const isSupabaseConfigured = Boolean(url && anonKey);

// A single browser client, persisting the session in localStorage and refreshing
// tokens automatically. When env is missing we still export a client pointed at
// a placeholder so imports don't throw; calls simply fail and the UI explains it.
export const supabase: SupabaseClient = createClient(
  url ?? "https://placeholder.supabase.co",
  anonKey ?? "placeholder-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  }
);

/** Current access token (JWT) for authorizing API calls, or null when signed out. */
export async function getAccessToken(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
