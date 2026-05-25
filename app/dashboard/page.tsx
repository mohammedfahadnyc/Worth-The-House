"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/loading-state";
import { ProfileSummary } from "@/components/profile-summary";
import { PropertyCard } from "@/components/property-card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { ensureProfile } from "@/lib/profile";
import type { Profile, Property } from "@/lib/types";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return router.replace("/login");

      const profileData = await ensureProfile(supabase, auth.user);
      if (!profileData?.setup_complete) return router.replace("/setup");

      const { data: propertyData } = await supabase
        .from("properties")
        .select("*")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false });

      setProfile(profileData as Profile);
      setProperties((propertyData ?? []) as Property[]);
      setLoading(false);
    }
    load();
  }, [router, supabase]);

  if (loading || !profile) return <LoadingState label="Loading dashboard..." />;

  return (
    <AppShell profile={profile}>
      <section className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">WorthTheHouse</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Your personal deal notebook and mortgage feasibility dashboard.
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/properties/new">
            <Plus className="h-4 w-4" />
            Add House
          </Link>
        </Button>
      </section>

      <ProfileSummary profile={profile} />

      <section className="mt-8">
        {properties.length === 0 ? (
          <EmptyState
            title="No properties yet."
            description="Add your first house and start tracking the numbers, notes, and tour impressions."
            action={
              <Button asChild>
                <Link href="/properties/new">Add first house</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {properties.map((property) => (
              <PropertyCard key={property.id} property={property} profile={profile} />
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
