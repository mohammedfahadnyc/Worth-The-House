"use client";

import type { User } from "@supabase/supabase-js";
import { makeProfileHandle } from "@/lib/auth";
import type { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

type SupabaseClient = ReturnType<typeof createClient>;

export async function ensureProfile(supabase: SupabaseClient, user: User) {
  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing) return existing as Profile;

  const email = user.email ?? `${user.id}@worththehouse.local`;
  const { data: created, error: insertError } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      username: makeProfileHandle(email, user.id),
    })
    .select("*")
    .single();

  if (insertError) throw insertError;
  return created as Profile;
}
