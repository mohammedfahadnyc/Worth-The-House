"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, MessageSquare } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { LoadingState } from "@/components/loading-state";
import { MetricCard } from "@/components/metric-card";
import { MortgageCalculator } from "@/components/mortgage-calculator";
import { NotesSection } from "@/components/notes-section";
import { PermissionBadge } from "@/components/permission-badge";
import { PropertyStageBadge } from "@/components/property-stage-badge";
import { PropertyStageSelect } from "@/components/property-stage-select";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { calculateMortgage, getPropertyStatus, mortgageInputsFrom, TARGET_DTI } from "@/lib/calculations";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { ensureProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/client";
import type { DealRoom, DealRoomPropertyComment, Profile, Property, PropertyStage } from "@/lib/types";
import { normalizeExternalUrl } from "@/lib/urls";

const generalPlaceholder =
  "Bedrooms, bathrooms, zip code, parking, basement, neighborhood, repairs, first impression, deal concerns, anything you want to remember...";

export default function DealRoomPropertyDetailPage() {
  const { id, propertyId } = useParams<{ id: string; propertyId: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<Profile | null>(null);
  const [room, setRoom] = useState<DealRoom | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [overview, setOverview] = useState<{ address: string; listing_url: string; general_notes: string; stage: PropertyStage }>({
    address: "",
    listing_url: "",
    general_notes: "",
    stage: "just_interested",
  });
  const [comments, setComments] = useState<DealRoomPropertyComment[]>([]);
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      return router.replace(
        `/login?returnTo=${encodeURIComponent(`/deal-rooms/${id}/properties/${propertyId}`)}`,
      );
    }
    const loadedProfile = await ensureProfile(supabase, auth.user);
    if (!loadedProfile.setup_complete) return router.replace("/setup");

    const { data: roomData } = await supabase.from("deal_rooms").select("*").eq("id", id).single();
    const { data: linkData } = await supabase
      .from("deal_room_properties")
      .select("id")
      .eq("deal_room_id", id)
      .eq("property_id", propertyId)
      .maybeSingle();

    if (!roomData || !linkData) {
      setLoading(false);
      return;
    }

    const { data: ownerData } = await supabase.from("profiles").select("*").eq("id", roomData.owner_id).single();
    const { data: propertyData } = await supabase.from("properties").select("*").eq("id", propertyId).single();
    const { data: commentData } = await supabase
      .from("deal_room_property_comments")
      .select("*")
      .eq("deal_room_id", id)
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false });

    setUserId(auth.user.id);
    setProfile(loadedProfile);
    setRoom(roomData as DealRoom);
    setOwnerProfile(ownerData as Profile);
    setProperty(propertyData as Property);
    setOverview({
      address: propertyData?.address ?? "",
      listing_url: propertyData?.listing_url ?? "",
      general_notes: propertyData?.general_notes ?? "",
      stage: propertyData?.stage ?? "just_interested",
    });
    setComments((commentData ?? []) as DealRoomPropertyComment[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, propertyId]);

  async function saveOverview() {
    if (!property || !overview.address.trim()) return;
    const values = {
      address: overview.address.trim(),
      listing_url: normalizeExternalUrl(overview.listing_url),
      general_notes: overview.general_notes,
      stage: overview.stage,
    };
    const { error } = await supabase.from("properties").update(values).eq("id", property.id);
    setMessage(error ? "Could not save overview." : "Overview saved.");
    if (!error) setProperty({ ...property, ...values });
  }

  async function saveStage(stage: PropertyStage) {
    if (!property) return;
    const previous = property;
    setOverview((current) => ({ ...current, stage }));
    setProperty({ ...property, stage });
    setMessage("");
    const { error } = await supabase.from("properties").update({ stage }).eq("id", property.id);
    if (error) {
      setProperty(previous);
      setOverview((current) => ({ ...current, stage: previous.stage ?? "just_interested" }));
      setMessage("Could not update deal stage.");
      return;
    }
    setMessage("Deal stage updated.");
  }

  async function saveMortgage(values: Partial<Property>) {
    if (!property) return;
    const { error } = await supabase.from("properties").update(values).eq("id", property.id);
    if (error) throw error;
    setProperty({ ...property, ...values });
  }

  async function saveTourNotes(value: string) {
    if (!property) return;
    const { error } = await supabase.from("properties").update({ tour_notes: value }).eq("id", property.id);
    if (error) throw error;
    setProperty({ ...property, tour_notes: value });
  }

  async function addComment() {
    if (!room || !property || !comment.trim()) return;
    const { error } = await supabase.from("deal_room_property_comments").insert({
      deal_room_id: room.id,
      property_id: property.id,
      user_id: userId,
      comment: comment.trim().slice(0, 2000),
    });

    if (error) {
      setMessage("Could not add comment.");
      return;
    }

    setComment("");
    setMessage("Comment added.");
    await load();
  }

  if (loading) return <LoadingState label="Loading room property..." />;
  if (!profile || !ownerProfile || !room || !property) {
    return <main className="p-8 text-sm text-muted-foreground">This room property is unavailable.</main>;
  }

  const isOwner = room.owner_id === userId;
  const results = calculateMortgage(mortgageInputsFrom(ownerProfile, property));
  const status = getPropertyStatus(results);

  return (
    <AppShell profile={profile}>
      <div className="mb-6">
        <Button asChild variant="ghost" className="-ml-3 mb-4">
          <Link href={`/deal-rooms/${room.id}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to Deal Room
          </Link>
        </Button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap gap-2">
              <PermissionBadge kind="private" />
              <PermissionBadge kind={isOwner ? "owner" : "collaborator"} />
            </div>
            <h1 className="truncate text-3xl font-semibold tracking-normal sm:text-4xl">{property.address}</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Full Deal Room view. Calculations use {isOwner ? "your" : `${ownerProfile.username}'s`} buying profile.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {property.listing_url ? (
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <a href={property.listing_url} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  View listing
                </a>
              </Button>
            ) : null}
            <PropertyStageBadge stage={property.stage} />
            <StatusBadge status={status} />
          </div>
        </div>
      </div>

      {message ? <p className="mb-6 rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm text-muted-foreground">{message}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          {isOwner ? (
            <Card>
              <CardHeader>
                <CardTitle>Overview</CardTitle>
                <CardDescription>Owner controls for this shared room property.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" value={overview.address} onChange={(event) => setOverview({ ...overview, address: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="listing-url">Listing link</Label>
                  <Input id="listing-url" value={overview.listing_url} onChange={(event) => setOverview({ ...overview, listing_url: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stage">Deal stage</Label>
                  <PropertyStageSelect value={overview.stage} onChange={saveStage} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="general-notes">General Notes</Label>
                  <Textarea
                    id="general-notes"
                    value={overview.general_notes}
                    onChange={(event) => setOverview({ ...overview, general_notes: event.target.value })}
                    placeholder={generalPlaceholder}
                    className="min-h-[320px] text-base leading-7"
                  />
                </div>
                <Button onClick={saveOverview}>Save overview</Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Overview</CardTitle>
                <CardDescription>Read-only shared property notes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="whitespace-pre-line text-sm leading-7 text-muted-foreground">
                  {property.general_notes?.trim() || "No notes yet."}
                </p>
              </CardContent>
            </Card>
          )}

          {isOwner ? (
            <>
              <MortgageCalculator profile={ownerProfile} property={property} onSave={saveMortgage} />
              <NotesSection
                title="Tour Notes"
                value={property.tour_notes ?? ""}
                placeholder="Write what you noticed during the tour..."
                onSave={saveTourNotes}
              />
            </>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Loan amount" value={formatCurrency(results.loan_amount)} />
                <MetricCard label="Down payment" value={formatCurrency(results.down_payment_amount)} />
                <MetricCard label="Principal + interest" value={formatCurrency(results.monthly_PI)} />
                <MetricCard label="Total monthly payment" value={formatCurrency(results.total_monthly_payment)} />
                <MetricCard label="Usable rental income" value={formatCurrency(results.usable_rental_income)} helper="75% of projected rent." />
                <MetricCard label="DTI" value={formatPercent(results.dti_percent)} helper="Target is 45%." emphasis={results.dti <= TARGET_DTI ? "good" : "danger"} />
                <MetricCard label="DTI income" value={formatCurrency(results.dti_income)} />
                <MetricCard label="DTI debt" value={formatCurrency(results.dti_debt)} />
                <MetricCard label="Cash to close" value={formatCurrency(results.cash_to_close)} />
                <MetricCard label="Remaining cash" value={formatCurrency(results.remaining_cash_after_close)} emphasis={results.remaining_cash_after_close >= 0 ? "good" : "danger"} />
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Mortgage Assumptions</CardTitle>
                  <CardDescription>Read-only acquisition assumptions for this Deal Room.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <MetricCard label="Purchase price" value={formatCurrency(property.purchase_price)} />
                  <MetricCard label="Interest rate" value={formatPercent(property.interest_rate)} />
                  <MetricCard label="Down payment" value={formatPercent(property.down_payment_percent)} />
                  <MetricCard label="Loan term" value={`${property.loan_term_years} years`} />
                  <MetricCard label="Annual taxes" value={formatCurrency(property.annual_taxes)} />
                  <MetricCard label="Annual insurance" value={formatCurrency(property.annual_insurance)} />
                  <MetricCard label="Monthly HOA" value={formatCurrency(property.monthly_hoa)} />
                  <MetricCard label="Monthly PMI" value={formatCurrency(property.monthly_pmi)} />
                  <MetricCard label="Rental income" value={formatCurrency(property.monthly_rental_income)} />
                  <MetricCard label="Repair reserve" value={formatCurrency(property.repair_reserve)} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Tour Notes</CardTitle>
                  <CardDescription>Read-only tour observations.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line text-sm leading-7 text-muted-foreground">
                    {property.tour_notes?.trim() || "No tour notes yet."}
                  </p>
                </CardContent>
              </Card>
            </>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Deal Room Comments
              </CardTitle>
              <CardDescription>Collaborators can leave quick notes without editing the property.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                maxLength={2000}
                placeholder="Add a quick Deal Room comment..."
                className="min-h-[120px]"
              />
              <Button onClick={addComment} disabled={!comment.trim()}>Add comment</Button>
              <div className="space-y-3">
                {comments.length === 0 ? <p className="text-sm text-muted-foreground">No comments yet.</p> : null}
                {comments.map((item) => (
                  <div key={item.id} className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                    <p className="whitespace-pre-line text-sm leading-6 text-slate-200">{item.comment}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {item.user_id === userId ? "You" : "Collaborator"} · {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <MetricCard label="DTI" value={formatPercent(results.dti_percent)} helper="Target is 45%." emphasis={results.dti <= TARGET_DTI ? "good" : "danger"} />
          <MetricCard label="Monthly payment" value={formatCurrency(results.total_monthly_payment)} />
          <MetricCard label="Cash to close" value={formatCurrency(results.cash_to_close)} />
          <MetricCard label="Remaining cash" value={formatCurrency(results.remaining_cash_after_close)} emphasis={results.remaining_cash_after_close >= 0 ? "good" : "danger"} />
        </aside>
      </div>
    </AppShell>
  );
}
