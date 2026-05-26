"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus, Share2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CopyLinkButton } from "@/components/copy-link-button";
import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/loading-state";
import { PermissionBadge } from "@/components/permission-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ensureProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Showcase } from "@/lib/types";
import { useRouter } from "next/navigation";

export default function ShowcasesPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showcases, setShowcases] = useState<Showcase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return router.replace("/login");
      const loadedProfile = await ensureProfile(supabase, auth.user);
      if (!loadedProfile.setup_complete) return router.replace("/setup");
      const { data } = await supabase.from("showcases").select("*").eq("owner_id", auth.user.id).order("updated_at", { ascending: false });
      setProfile(loadedProfile);
      setShowcases((data ?? []) as Showcase[]);
      setLoading(false);
    }
    load();
  }, [router, supabase]);

  if (loading || !profile) return <LoadingState label="Loading Showcases..." />;

  return (
    <AppShell profile={profile}>
      <section className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">Showcases</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Curated property boards you can share with family, agents, or advisors.
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/showcases/new"><Plus className="h-4 w-4" />Create Showcase</Link>
        </Button>
      </section>

      {showcases.length === 0 ? (
        <EmptyState
          title="No Showcases yet."
          description="Create a clean public board for a realtor or family review."
          action={<Button asChild><Link href="/showcases/new">Create Showcase</Link></Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {showcases.map((showcase) => {
            const url = `${window.location.origin}/s/${showcase.public_token}`;
            return (
              <Card key={showcase.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">{showcase.name}</h2>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{showcase.description || "No description yet."}</p>
                  </div>
                  <Share2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <PermissionBadge kind={showcase.access_mode} />
                </div>
                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <Button asChild className="flex-1"><Link href={`/showcases/${showcase.id}`}>Manage</Link></Button>
                  <CopyLinkButton value={url} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
