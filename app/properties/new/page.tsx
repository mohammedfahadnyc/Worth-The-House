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
import { normalizeExternalUrl } from "@/lib/urls";

export default function NewPropertyPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [address, setAddress] = useState("");
  const [listingUrl, setListingUrl] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return router.replace("/login");
      const data = await ensureProfile(supabase, auth.user);
      if (!data?.setup_complete) return router.replace("/setup");
      setProfile(data as Profile);
    }
    load();
  }, [router, supabase]);

  async function createProperty() {
    if (!profile) return;
    if (!address.trim()) {
      setError("Address is required.");
      return;
    }
    setSaving(true);
    setError("");
    const defaults = profile.use_default_house_data
      ? {
          purchase_price: profile.default_purchase_price,
          interest_rate: profile.default_interest_rate,
          down_payment_percent: profile.default_down_payment_percent,
          annual_taxes: profile.default_annual_taxes,
          annual_insurance: profile.default_annual_insurance,
          monthly_pmi: profile.default_monthly_pmi,
          monthly_hoa: profile.default_monthly_hoa,
          monthly_rental_income: profile.default_monthly_rental_income,
          loan_term_years: profile.default_loan_term_years,
          closing_cost_percent: profile.default_closing_cost_percent,
          repair_reserve: profile.default_repair_reserve,
        }
      : {
          purchase_price: 0,
          interest_rate: 7,
          down_payment_percent: 20,
          annual_taxes: 0,
          annual_insurance: 0,
          monthly_pmi: 0,
          monthly_hoa: 0,
          monthly_rental_income: 0,
          loan_term_years: 30,
          closing_cost_percent: 3,
          repair_reserve: 0,
        };

    const { data, error: insertError } = await supabase
      .from("properties")
      .insert({
        user_id: profile.id,
        address: address.trim(),
        listing_url: normalizeExternalUrl(listingUrl),
        general_notes: generalNotes,
        ...defaults,
      })
      .select("id")
      .single();

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    router.replace(`/properties/${data.id}`);
  }

  if (!profile) return <LoadingState label="Loading property form..." />;

  return (
    <AppShell profile={profile}>
      <div className="mx-auto max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Add a house</CardTitle>
            <CardDescription>Start with the address and your first impression. The numbers come next.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="123 Market Street, Pittsburgh, PA" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="listing-url">Listing link</Label>
              <Input
                id="listing-url"
                type="url"
                value={listingUrl}
                onChange={(event) => setListingUrl(event.target.value)}
                placeholder="https://www.zillow.com/homedetails/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">General notes</Label>
              <Textarea
                id="notes"
                value={generalNotes}
                onChange={(event) => setGeneralNotes(event.target.value)}
                placeholder="Bedrooms, bathrooms, zip code, parking, basement, neighborhood, repairs, first impression, deal concerns, anything you want to remember..."
                className="min-h-[300px] text-base leading-7"
              />
            </div>
            {error ? <p className="rounded-md border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p> : null}
            <Button onClick={createProperty} disabled={saving} className="w-full sm:w-auto">
              {saving ? "Creating..." : "Create property"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
