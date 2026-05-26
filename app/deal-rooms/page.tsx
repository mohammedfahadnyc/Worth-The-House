"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/loading-state";
import { PermissionBadge } from "@/components/permission-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ensureProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/client";
import type { DealRoom, Profile } from "@/lib/types";
import { useRouter } from "next/navigation";

export default function DealRoomsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rooms, setRooms] = useState<DealRoom[]>([]);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return router.replace("/login");
      const loadedProfile = await ensureProfile(supabase, auth.user);
      if (!loadedProfile.setup_complete) return router.replace("/setup");
      const { data } = await supabase.from("deal_rooms").select("*").order("updated_at", { ascending: false });
      setProfile(loadedProfile);
      setUserId(auth.user.id);
      setRooms((data ?? []) as DealRoom[]);
      setLoading(false);
    }
    load();
  }, [router, supabase]);

  if (loading || !profile) return <LoadingState label="Loading Deal Rooms..." />;

  return (
    <AppShell profile={profile}>
      <section className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">Deal Rooms</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Private spaces for trusted buyers, spouses, partners, or family.
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/deal-rooms/new">
            <Plus className="h-4 w-4" />
            Create Deal Room
          </Link>
        </Button>
      </section>

      {rooms.length === 0 ? (
        <EmptyState
          title="No Deal Rooms yet."
          description="Create a private room to analyze properties with someone you trust."
          action={<Button asChild><Link href="/deal-rooms/new">Create Deal Room</Link></Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rooms.map((room) => (
            <Link key={room.id} href={`/deal-rooms/${room.id}`} className="group block">
              <Card className="h-full p-5 transition hover:border-emerald-400/30">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">{room.name}</h2>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{room.description || "No description yet."}</p>
                  </div>
                  <Users className="h-5 w-5 text-muted-foreground group-hover:text-emerald-200" />
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <PermissionBadge kind={room.owner_id === userId ? "owner" : "collaborator"} />
                  <PermissionBadge kind="private" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
