"use client";

import type { User } from "@supabase/supabase-js";
import { makeProfileHandle } from "@/lib/auth";
import type { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

type SupabaseClient = ReturnType<typeof createClient>;

function supabaseMessage(error: { message?: string; details?: string; hint?: string }) {
  return [error.message, error.details, error.hint].filter(Boolean).join(" ");
}

export async function ensureProfile(supabase: SupabaseClient, user: User) {
  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError) throw new Error(supabaseMessage(selectError) || "Could not load profile.");
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

  if (insertError) throw new Error(supabaseMessage(insertError) || "Could not create profile.");
  return created as Profile;
}
