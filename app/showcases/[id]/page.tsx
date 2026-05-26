"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ExternalLink, MessageSquare, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CopyLinkButton } from "@/components/copy-link-button";
import { LoadingState } from "@/components/loading-state";
import { PermissionBadge } from "@/components/permission-badge";
import { PropertyStageBadge } from "@/components/property-stage-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ensureProfile } from "@/lib/profile";
import { getPublicPropertySummary } from "@/lib/share";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Property, PublicPropertyComment, Showcase } from "@/lib/types";
import { formatCurrency } from "@/lib/formatters";

export default function ShowcaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showcase, setShowcase] = useState<Showcase | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [comments, setComments] = useState<PublicPropertyComment[]>([]);
  const [myProperties, setMyProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return router.replace("/login");
    const loadedProfile = await ensureProfile(supabase, auth.user);
    if (!loadedProfile.setup_complete) return router.replace("/setup");
    const { data: showcaseData } = await supabase.from("showcases").select("*").eq("id", id).eq("owner_id", auth.user.id).single();
    if (!showcaseData) {
      setLoading(false);
      return;
    }
    const { data: linkData } = await supabase.from("showcase_properties").select("*").eq("showcase_id", id);
    const ids = (linkData ?? []).map((item) => item.property_id);
    const { data: propertyData } = ids.length ? await supabase.from("properties").select("*").in("id", ids) : { data: [] };
    const { data: commentData } = await supabase.from("public_property_comments").select("*").eq("showcase_id", id).order("created_at", { ascending: false });
    const { data: mine } = await supabase.from("properties").select("*").eq("user_id", auth.user.id).order("created_at", { ascending: false });
    setProfile(loadedProfile);
    setShowcase(showcaseData as Showcase);
    setProperties((propertyData ?? []) as Property[]);
    setComments((commentData ?? []) as PublicPropertyComment[]);
    setMyProperties((mine ?? []) as Property[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function addExistingProperty() {
    if (!selectedProperty || !showcase) return;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { error } = await supabase.from("showcase_properties").insert({
      showcase_id: showcase.id,
      property_id: selectedProperty,
      added_by: auth.user.id,
    });
    setMessage(error?.code === "23505" ? "Already added." : error ? "Could not add property." : "Property added.");
    await load();
  }

  async function removeProperty(propertyId: string) {
    if (!showcase) return;
    await supabase.from("showcase_properties").delete().eq("showcase_id", showcase.id).eq("property_id", propertyId);
    await load();
  }

  async function updateMode(mode: "view_only" | "can_comment") {
    if (!showcase) return;
    await supabase.from("showcases").update({ access_mode: mode }).eq("id", showcase.id);
    setShowcase({ ...showcase, access_mode: mode });
  }

  async function deleteShowcase() {
    if (!showcase || !window.confirm("Delete this Showcase? Public links and comments for this board will be removed.")) return;
    const { error } = await supabase.from("showcases").delete().eq("id", showcase.id);

    if (error) {
      setMessage("Could not delete Showcase.");
      return;
    }

    router.replace("/showcases");
  }

  if (loading) return <LoadingState label="Loading Showcase..." />;
  if (!profile || !showcase) return <main className="p-8 text-sm text-muted-foreground">This Showcase is unavailable.</main>;

  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/s/${showcase.public_token}` : "";

  return (
    <AppShell profile={profile}>
      <section className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap gap-2"><PermissionBadge kind={showcase.access_mode} /></div>
          <h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">{showcase.name}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{showcase.description || "No description yet."}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild variant="outline"><Link href={`/s/${showcase.public_token}`}><ExternalLink className="h-4 w-4" />Open public view</Link></Button>
          {publicUrl ? <CopyLinkButton value={publicUrl} /> : null}
        </div>
      </section>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Add Existing Property</CardTitle>
            <CardDescription>Add properties without duplicating them.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <select className="h-11 w-full rounded-md border border-input bg-white/[0.04] px-3 text-sm" value={selectedProperty} onChange={(event) => setSelectedProperty(event.target.value)}>
              <option value="">Choose a property</option>
              {myProperties.map((property) => <option key={property.id} value={property.id}>{property.address}</option>)}
            </select>
            <Button onClick={addExistingProperty} disabled={!selectedProperty}><Plus className="h-4 w-4" />Add to Showcase</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Access Mode</CardTitle>
            <CardDescription>Choose whether public viewers can leave comments.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button variant={showcase.access_mode === "view_only" ? "secondary" : "outline"} onClick={() => updateMode("view_only")}>View only</Button>
            <Button variant={showcase.access_mode === "can_comment" ? "secondary" : "outline"} onClick={() => updateMode("can_comment")}>Can comment</Button>
          </CardContent>
        </Card>
      </div>

      {message ? <p className="mb-6 rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm text-muted-foreground">{message}</p> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {properties.map((property) => {
          const summary = getPublicPropertySummary(property, profile);
          const propertyComments = comments.filter((comment) => comment.property_id === property.id);
          return (
            <Card key={property.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">{property.address}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{property.general_notes?.split("\n")[0] || "No notes yet."}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <PropertyStageBadge stage={property.stage} />
                  <PermissionBadge kind={summary.dtiStatus === "over_target" ? "can_comment" : "view_only"} />
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div><p className="text-xs text-muted-foreground">Price</p><p className="text-sm font-medium">{formatCurrency(property.purchase_price)}</p></div>
                <div><p className="text-xs text-muted-foreground">Monthly</p><p className="text-sm font-medium">{formatCurrency(summary.total_monthly_payment)}</p></div>
                <div><p className="text-xs text-muted-foreground">Comments</p><p className="text-sm font-medium">{propertyComments.length}</p></div>
              </div>
              {propertyComments[0] ? (
                <p className="mt-4 rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm text-muted-foreground">
                  <MessageSquare className="mr-2 inline h-4 w-4" />{propertyComments[0].comment}
                </p>
              ) : null}
              <div className="mt-5 flex gap-2">
                <Button asChild><Link href={`/s/${showcase.public_token}/properties/${property.id}`}>Public detail</Link></Button>
                <Button variant="outline" onClick={() => removeProperty(property.id)}>Remove</Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mt-8 border-red-400/20 bg-red-400/[0.04]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-100">
            <Trash2 className="h-5 w-5" />
            Delete Showcase
          </CardTitle>
          <CardDescription>
            This removes the public board, public link, and its comments. Your properties stay saved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={deleteShowcase}>
            Delete Showcase
          </Button>
        </CardContent>
      </Card>
    </AppShell>
  );
}
