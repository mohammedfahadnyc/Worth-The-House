"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { LoadingState } from "@/components/loading-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ensureProfile } from "@/lib/profile";
import { generatePublicToken } from "@/lib/share";
import { createClient } from "@/lib/supabase/client";
import type { Profile, ShowcaseAccessMode } from "@/lib/types";

export default function NewShowcasePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [accessMode, setAccessMode] = useState<ShowcaseAccessMode>("view_only");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return router.replace("/login");
      const loadedProfile = await ensureProfile(supabase, data.user);
      if (!loadedProfile.setup_complete) return router.replace("/setup");
      setProfile(loadedProfile);
    }
    load();
  }, [router, supabase]);

  async function createShowcase() {
    if (!name.trim()) return setError("Name is required.");
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    setSaving(true);
    const { data: showcase, error: createError } = await supabase
      .from("showcases")
      .insert({
        owner_id: data.user.id,
        name: name.trim(),
        description: description.trim(),
        access_mode: accessMode,
        public_token: generatePublicToken(),
      })
      .select("id")
      .single();
    setSaving(false);
    if (createError) return setError(createError.message);
    router.replace(`/showcases/${showcase.id}`);
  }

  if (!profile) return <LoadingState label="Loading..." />;

  return (
    <AppShell profile={profile}>
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Create Showcase</CardTitle>
            <CardDescription>Build a clean public board for a realtor, family member, or advisor.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Top three Bronx options" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mode">Public access</Label>
              <select id="mode" className="h-11 w-full rounded-md border border-input bg-white/[0.04] px-3 text-sm" value={accessMode} onChange={(event) => setAccessMode(event.target.value as ShowcaseAccessMode)}>
                <option value="view_only">View only</option>
                <option value="can_comment">Can comment</option>
              </select>
            </div>
            {error ? <p className="text-sm text-red-200">{error}</p> : null}
            <Button onClick={createShowcase} disabled={saving}>{saving ? "Creating..." : "Create Showcase"}</Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
