"use client";

import { createBrowserClient } from "@supabase/ssr";

type BrowserClient = ReturnType<typeof createBrowserClient>;

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}

export function createClient(): BrowserClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "missing-publishable-key";

  return createBrowserClient(url, key);
}
