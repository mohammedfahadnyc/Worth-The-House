"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { LoadingState } from "@/components/loading-state";
import { MetricCard } from "@/components/metric-card";
import { MortgageCalculator } from "@/components/mortgage-calculator";
import { NotesSection } from "@/components/notes-section";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { calculateMortgage, getPropertyStatus, mortgageInputsFrom, TARGET_DTI } from "@/lib/calculations";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Property } from "@/lib/types";

const generalPlaceholder =
  "Bedrooms, bathrooms, zip code, parking, basement, neighborhood, repairs, first impression, deal concerns, anything you want to remember...";

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [overview, setOverview] = useState({ address: "", general_notes: "" });
  const [loading, setLoading] = useState(true);
  const [savingOverview, setSavingOverview] = useState(false);
  const [overviewMessage, setOverviewMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return router.replace("/login");
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", auth.user.id).single();
      if (!profileData?.setup_complete) return router.replace("/setup");
      const { data: propertyData, error: propertyError } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .eq("user_id", auth.user.id)
        .single();

      if (propertyError || !propertyData) {
        setError(propertyError?.message ?? "Property not found.");
      } else {
        setProfile(profileData as Profile);
        setProperty(propertyData as Property);
        setOverview({
          address: propertyData.address,
          general_notes: propertyData.general_notes ?? "",
        });
      }
      setLoading(false);
    }
    load();
  }, [id, router, supabase]);

  const results = useMemo(() => {
    if (!profile || !property) return null;
    return calculateMortgage(mortgageInputsFrom(profile, property));
  }, [profile, property]);

  async function saveOverview() {
    if (!property) return;
    if (!overview.address.trim()) {
      setOverviewMessage("Address is required.");
      return;
    }
    setSavingOverview(true);
    setOverviewMessage("");
    const { error: saveError } = await supabase
      .from("properties")
      .update({ address: overview.address.trim(), general_notes: overview.general_notes })
      .eq("id", property.id);
    setSavingOverview(false);
    if (saveError) {
      setOverviewMessage(saveError.message);
      return;
    }
    setProperty({ ...property, address: overview.address.trim(), general_notes: overview.general_notes });
    setOverviewMessage("Saved");
  }

  async function saveMortgage(values: Partial<Property>) {
    if (!property) return;
    const { error: saveError } = await supabase.from("properties").update(values).eq("id", property.id);
    if (saveError) throw saveError;
    setProperty({ ...property, ...values });
  }

  async function saveTourNotes(value: string) {
    if (!property) return;
    const { error: saveError } = await supabase
      .from("properties")
      .update({ tour_notes: value })
      .eq("id", property.id);
    if (saveError) throw saveError;
    setProperty({ ...property, tour_notes: value });
  }

  async function deleteProperty() {
    if (!property) return;
    const confirmed = window.confirm("Delete this property? This cannot be undone.");
    if (!confirmed) return;
    const { error: deleteError } = await supabase.from("properties").delete().eq("id", property.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    router.replace("/dashboard");
  }

  if (loading) return <LoadingState label="Loading property..." />;
  if (!profile || !property || !results) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <p className="rounded-md border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">
          {error || "Property not found."}
        </p>
      </main>
    );
  }

  const status = getPropertyStatus(results);

  return (
    <AppShell profile={profile}>
      <div className="mb-6">
        <Button asChild variant="ghost" className="-ml-3 mb-4">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
        </Button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-3xl font-semibold tracking-normal sm:text-4xl">{property.address}</h1>
            <p className="mt-3 text-sm text-muted-foreground">Saved property notebook and deal math.</p>
          </div>
          <StatusBadge status={status} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
              <CardDescription>Keep the core property notes comfortable and easy to revisit.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" value={overview.address} onChange={(event) => setOverview({ ...overview, address: event.target.value })} />
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
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button onClick={saveOverview} disabled={savingOverview} className="w-full sm:w-auto">
                  {savingOverview ? "Saving..." : "Save overview"}
                </Button>
                {overviewMessage ? <p className="text-sm text-muted-foreground">{overviewMessage}</p> : null}
              </div>
            </CardContent>
          </Card>

          <MortgageCalculator profile={profile} property={property} onSave={saveMortgage} />

          <NotesSection
            title="Tour Notes"
            value={property.tour_notes ?? ""}
            placeholder="Write what you noticed during the tour: room sizes, layout, smell, basement, parking, street, neighbors, repairs, roof, furnace, water heater, natural light, noise, gut feeling, red flags..."
            onSave={saveTourNotes}
          />

          <Card className="border-red-400/15 bg-red-400/[0.03]">
            <CardHeader>
              <CardTitle>Danger zone</CardTitle>
              <CardDescription>Remove this property from your notebook.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={deleteProperty}>
                <Trash2 className="h-4 w-4" />
                Delete property
              </Button>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <MetricCard
            label="DTI"
            value={formatPercent(results.dti_percent)}
            helper="Target is 45%."
            emphasis={results.dti <= TARGET_DTI ? "good" : "danger"}
          />
          <MetricCard label="Monthly payment" value={formatCurrency(results.total_monthly_payment)} />
          <MetricCard label="Cash to close" value={formatCurrency(results.cash_to_close)} />
          <MetricCard
            label="Remaining cash"
            value={formatCurrency(results.remaining_cash_after_close)}
            emphasis={results.remaining_cash_after_close >= 0 ? "good" : "danger"}
          />
        </aside>
      </div>
    </AppShell>
  );
}
