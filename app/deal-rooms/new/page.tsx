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
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

export default function NewDealRoomPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
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

  async function createRoom() {
    if (!name.trim()) return setError("Name is required.");
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    setSaving(true);
    const { data: room, error: createError } = await supabase
      .from("deal_rooms")
      .insert({ owner_id: data.user.id, name: name.trim(), description: description.trim() })
      .select("id")
      .single();
    setSaving(false);
    if (createError) return setError(createError.message);
    router.replace(`/deal-rooms/${room.id}`);
  }

  if (!profile) return <LoadingState label="Loading..." />;

  return (
    <AppShell profile={profile}>
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Create Deal Room</CardTitle>
            <CardDescription>Invite trusted people to help analyze and add listings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Bronx multifamily shortlist" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} />
            </div>
            {error ? <p className="text-sm text-red-200">{error}</p> : null}
            <Button onClick={createRoom} disabled={saving}>{saving ? "Creating..." : "Create Deal Room"}</Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
