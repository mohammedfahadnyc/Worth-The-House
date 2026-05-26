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
import { parseListingText, parsedListingNotes, type ParsedListing } from "@/lib/listing-parser";
import { ensureProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { normalizeExternalUrl } from "@/lib/urls";
import { formatCurrency, formatNumber } from "@/lib/formatters";

type ListingMortgageOverrides = {
  purchase_price?: number;
  annual_taxes?: number;
  monthly_hoa?: number;
};

export default function NewPropertyPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [address, setAddress] = useState("");
  const [listingUrl, setListingUrl] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");
  const [listingPaste, setListingPaste] = useState("");
  const [parsedListing, setParsedListing] = useState<ParsedListing | null>(null);
  const [listingMortgageOverrides, setListingMortgageOverrides] = useState<ListingMortgageOverrides>({});
  const [parseMessage, setParseMessage] = useState("");
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
    const { data: existing } = await supabase
      .from("properties")
      .select("id, address")
      .eq("user_id", profile.id);
    const duplicate = (existing ?? []).find(
      (property) => property.address.trim().toLowerCase().replace(/\s+/g, " ") === address.trim().toLowerCase().replace(/\s+/g, " "),
    );
    if (duplicate) {
      setSaving(false);
      setError("This house already exists in your dashboard.");
      return;
    }
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
        ...listingMortgageOverrides,
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

  function parseListing() {
    setParseMessage("");
    try {
      const parsed = parseListingText(listingPaste);
      setParsedListing(parsed);
    } catch (caught) {
      console.error(caught);
      setParsedListing({
        rawSnapshot: listingPaste,
        extractedFieldsCount: 0,
        warnings: ["Couldn't parse this listing, but you can still save it as a note."],
      });
    }
  }

  function appendRawTextToNotes() {
    if (!listingPaste.trim()) return;
    setGeneralNotes((current) =>
      [current.trim(), `Listing paste\n${listingPaste.trim()}`].filter(Boolean).join("\n\n"),
    );
    setParseMessage("Listing text appended to notes.");
  }

  function clearImport() {
    setListingPaste("");
    setParsedListing(null);
    setListingMortgageOverrides({});
    setParseMessage("");
  }

  function prefillFromListing() {
    if (!parsedListing || parsedListing.extractedFieldsCount === 0) return;
    if (parsedListing.address) setAddress(parsedListing.address);
    setListingMortgageOverrides({
      ...(parsedListing.price && parsedListing.price > 50_000
        ? { purchase_price: parsedListing.price }
        : {}),
      ...(parsedListing.annualTaxes && parsedListing.annualTaxes > 0
        ? { annual_taxes: parsedListing.annualTaxes }
        : {}),
      ...(parsedListing.monthlyHoa !== undefined && parsedListing.monthlyHoa !== null
        ? { monthly_hoa: parsedListing.monthlyHoa }
        : {}),
    });

    const listingNotes = parsedListingNotes(parsedListing);
    if (listingNotes) {
      setGeneralNotes((current) =>
        current.includes(listingNotes)
          ? current
          : [current.trim(), listingNotes].filter(Boolean).join("\n\n"),
      );
    }
    setParseMessage("Listing details applied.");
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
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
              <div className="space-y-2">
                <Label htmlFor="listing-paste">Paste listing text</Label>
                <Textarea
                  id="listing-paste"
                  value={listingPaste}
                  onChange={(event) => setListingPaste(event.target.value)}
                  placeholder="Paste Zillow, Redfin, Realtor, or listing page text here. Import is best-effort; you can always save the raw text in notes."
                  className="min-h-[180px]"
                />
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button type="button" variant="secondary" onClick={parseListing} className="w-full sm:w-auto">
                  Parse listing
                </Button>
                {parsedListing?.extractedFieldsCount ? (
                  <Button type="button" onClick={prefillFromListing} className="w-full sm:w-auto">
                    Prefill everything
                  </Button>
                ) : null}
                <Button type="button" variant="outline" onClick={appendRawTextToNotes} className="w-full sm:w-auto">
                  Append raw text to notes
                </Button>
                <Button type="button" variant="ghost" onClick={clearImport} className="w-full sm:w-auto">
                  Clear import
                </Button>
              </div>

              {parsedListing ? (
                parsedListing.extractedFieldsCount > 0 ? (
                  <div className="mt-4 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.06] p-4">
                    <p className="text-sm font-medium text-emerald-100">Found from listing</p>
                    <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                      {parsedListing.price ? <p>Price: {formatCurrency(parsedListing.price)}</p> : null}
                      {parsedListing.address ? <p>Address: {parsedListing.address}</p> : null}
                      {parsedListing.beds ? <p>Beds: {parsedListing.beds}</p> : null}
                      {parsedListing.baths ? <p>Baths: {parsedListing.baths}</p> : null}
                      {parsedListing.sqft ? <p>Sqft: {formatNumber(parsedListing.sqft)}</p> : null}
                      {parsedListing.annualTaxes ? <p>Annual taxes: {formatCurrency(parsedListing.annualTaxes)}</p> : null}
                      {parsedListing.yearBuilt ? <p>Year built: {parsedListing.yearBuilt}</p> : null}
                      {parsedListing.propertyType ? <p>Type: {parsedListing.propertyType}</p> : null}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-lg border border-white/10 bg-black/15 p-4">
                    <p className="text-sm font-medium text-slate-100">
                      We could not confidently extract details from this paste.
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      You can still save the full listing text into your notes.
                    </p>
                  </div>
                )
              ) : null}
              {parseMessage ? <p className="mt-3 text-sm text-muted-foreground">{parseMessage}</p> : null}
            </div>

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
