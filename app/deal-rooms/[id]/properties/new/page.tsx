"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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
import type { DealRoom, Profile, Property } from "@/lib/types";
import { normalizeExternalUrl } from "@/lib/urls";
import { formatCurrency, formatNumber } from "@/lib/formatters";

type ListingMortgageOverrides = {
  purchase_price?: number;
  annual_taxes?: number;
  monthly_hoa?: number;
};

export default function NewDealRoomPropertyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<Profile | null>(null);
  const [room, setRoom] = useState<DealRoom | null>(null);
  const [roomProperties, setRoomProperties] = useState<Property[]>([]);
  const [myProperties, setMyProperties] = useState<Property[]>([]);
  const [address, setAddress] = useState("");
  const [listingUrl, setListingUrl] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");
  const [listingPaste, setListingPaste] = useState("");
  const [parsedListing, setParsedListing] = useState<ParsedListing | null>(null);
  const [listingMortgageOverrides, setListingMortgageOverrides] = useState<ListingMortgageOverrides>({});
  const [userId, setUserId] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return router.replace(`/login?returnTo=${encodeURIComponent(`/deal-rooms/${id}/properties/new`)}`);
    const loadedProfile = await ensureProfile(supabase, auth.user);
    if (!loadedProfile.setup_complete) return router.replace("/setup");

    const { data: roomData } = await supabase.from("deal_rooms").select("*").eq("id", id).single();
    if (!roomData) return;
    const { data: ownerData } = await supabase.from("profiles").select("*").eq("id", roomData.owner_id).single();
    const { data: linkData } = await supabase.from("deal_room_properties").select("property_id").eq("deal_room_id", id);
    const propertyIds = (linkData ?? []).map((link) => link.property_id);
    const { data: roomPropertyData } = propertyIds.length
      ? await supabase.from("properties").select("*").in("id", propertyIds)
      : { data: [] };
    const { data: mine } = await supabase.from("properties").select("*").eq("user_id", auth.user.id);

    setUserId(auth.user.id);
    setProfile(loadedProfile);
    setOwnerProfile(ownerData as Profile);
    setRoom(roomData as DealRoom);
    setRoomProperties((roomPropertyData ?? []) as Property[]);
    setMyProperties((mine ?? []) as Property[]);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function normalized(value: string) {
    return value.trim().toLowerCase().replace(/\s+/g, " ");
  }

  async function linkProperty(propertyId: string) {
    if (!room) return;
    const { error } = await supabase.from("deal_room_properties").insert({
      deal_room_id: room.id,
      property_id: propertyId,
      added_by: userId,
    });
    if (error?.code === "23505") {
      setMessage("This house is already in the Deal Room.");
      return;
    }
    if (error) {
      setMessage("Could not add this house to the Deal Room.");
      return;
    }
    router.replace(`/deal-rooms/${room.id}/properties/${propertyId}`);
  }

  async function createOrLinkProperty() {
    if (!profile || !ownerProfile || !room) return;
    if (!address.trim()) {
      setMessage("Address is required.");
      return;
    }

    const cleanAddress = normalized(address);
    const existingRoomProperty = roomProperties.find((property) => normalized(property.address) === cleanAddress);
    if (existingRoomProperty) {
      setMessage("This house is already in the Deal Room.");
      return;
    }

    const existingOwnProperty = myProperties.find((property) => normalized(property.address) === cleanAddress);
    if (existingOwnProperty) {
      await linkProperty(existingOwnProperty.id);
      return;
    }

    setSaving(true);
    setMessage("");
    const defaultSource = ownerProfile.use_default_house_data ? ownerProfile : profile;
    const defaults = defaultSource.use_default_house_data
      ? {
          purchase_price: defaultSource.default_purchase_price,
          interest_rate: defaultSource.default_interest_rate,
          down_payment_percent: defaultSource.default_down_payment_percent,
          annual_taxes: defaultSource.default_annual_taxes,
          annual_insurance: defaultSource.default_annual_insurance,
          monthly_pmi: defaultSource.default_monthly_pmi,
          monthly_hoa: defaultSource.default_monthly_hoa,
          monthly_rental_income: defaultSource.default_monthly_rental_income,
          loan_term_years: defaultSource.default_loan_term_years,
          closing_cost_percent: defaultSource.default_closing_cost_percent,
          repair_reserve: defaultSource.default_repair_reserve,
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

    const { data, error } = await supabase
      .from("properties")
      .insert({
        user_id: userId,
        dashboard_visible: room.owner_id === userId,
        address: address.trim(),
        listing_url: normalizeExternalUrl(listingUrl),
        general_notes: generalNotes,
        ...defaults,
        ...listingMortgageOverrides,
      })
      .select("id")
      .single();

    setSaving(false);
    if (error || !data) {
      setMessage(error?.message ?? "Could not create property.");
      return;
    }

    await linkProperty(data.id);
  }

  function parseListing() {
    try {
      setParsedListing(parseListingText(listingPaste));
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
    setGeneralNotes((current) => [current.trim(), `Listing paste\n${listingPaste.trim()}`].filter(Boolean).join("\n\n"));
    setMessage("Listing text appended to notes.");
  }

  function prefillFromListing() {
    if (!parsedListing || parsedListing.extractedFieldsCount === 0) return;
    if (parsedListing.address) setAddress(parsedListing.address);
    setListingMortgageOverrides({
      ...(parsedListing.price && parsedListing.price > 50_000 ? { purchase_price: parsedListing.price } : {}),
      ...(parsedListing.annualTaxes && parsedListing.annualTaxes > 0 ? { annual_taxes: parsedListing.annualTaxes } : {}),
      ...(parsedListing.monthlyHoa !== undefined && parsedListing.monthlyHoa !== null ? { monthly_hoa: parsedListing.monthlyHoa } : {}),
    });
    const listingNotes = parsedListingNotes(parsedListing);
    if (listingNotes) {
      setGeneralNotes((current) => current.includes(listingNotes) ? current : [current.trim(), listingNotes].filter(Boolean).join("\n\n"));
    }
    setMessage("Listing details applied.");
  }

  if (!profile || !room || !ownerProfile) return <LoadingState label="Loading Deal Room form..." />;

  const ownDuplicate = myProperties.find((property) => normalized(property.address) === normalized(address));
  const roomDuplicate = roomProperties.find((property) => normalized(property.address) === normalized(address));

  return (
    <AppShell profile={profile}>
      <div className="mx-auto max-w-3xl">
        <Button asChild variant="ghost" className="-ml-3 mb-4">
          <Link href={`/deal-rooms/${room.id}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to Deal Room
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Add a house to {room.name}</CardTitle>
            <CardDescription>
              Create it directly in this Deal Room. Collaborator-created room houses stay out of their private dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
              <div className="space-y-2">
                <Label htmlFor="listing-paste">Paste listing text</Label>
                <Textarea
                  id="listing-paste"
                  value={listingPaste}
                  onChange={(event) => setListingPaste(event.target.value)}
                  placeholder="Paste Zillow, Redfin, Realtor, or listing page text here."
                  className="min-h-[180px]"
                />
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button type="button" variant="secondary" onClick={parseListing} className="w-full sm:w-auto">Parse listing</Button>
                {parsedListing?.extractedFieldsCount ? (
                  <Button type="button" onClick={prefillFromListing} className="w-full sm:w-auto">Prefill everything</Button>
                ) : null}
                <Button type="button" variant="outline" onClick={appendRawTextToNotes} className="w-full sm:w-auto">Append raw text to notes</Button>
                <Button type="button" variant="ghost" onClick={() => setListingPaste("")} className="w-full sm:w-auto">Clear import</Button>
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
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-lg border border-white/10 bg-black/15 p-4">
                    <p className="text-sm font-medium text-slate-100">We could not confidently extract details from this paste.</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">You can still save the full listing text into your notes.</p>
                  </div>
                )
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="123 Market Street, Pittsburgh, PA" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="listing-url">Listing link</Label>
              <Input id="listing-url" value={listingUrl} onChange={(event) => setListingUrl(event.target.value)} placeholder="https://www.zillow.com/homedetails/..." />
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

            {roomDuplicate ? <p className="rounded-md border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">This house is already in the Deal Room.</p> : null}
            {ownDuplicate && !roomDuplicate ? <p className="rounded-md border border-blue-400/20 bg-blue-400/10 p-3 text-sm text-blue-100">This house already exists in your dashboard. Use the button below to add it to this Deal Room.</p> : null}
            {message ? <p className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm text-muted-foreground">{message}</p> : null}

            <Button onClick={createOrLinkProperty} disabled={saving || Boolean(roomDuplicate)} className="w-full sm:w-auto">
              {saving ? "Saving..." : ownDuplicate ? "Add existing house to Deal Room" : "Create and add to Deal Room"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
