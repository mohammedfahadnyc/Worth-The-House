"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { PermissionBadge } from "@/components/permission-badge";
import { PropertyStageBadge } from "@/components/property-stage-badge";
import { PublicCommentsSection } from "@/components/public-comments-section";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import type { PublicPropertyComment, Showcase } from "@/lib/types";
import type { PropertyStage } from "@/lib/types";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type PublicShowcaseProperty = {
  showcase_id: string;
  showcase_name: string;
  showcase_description: string;
  access_mode: "view_only" | "can_comment";
  public_token: string;
  property_id: string;
  stage: PropertyStage;
  address: string;
  listing_url: string;
  general_notes: string;
  tour_notes: string;
  purchase_price: number;
  interest_rate: number;
  down_payment_percent: number;
  annual_taxes: number;
  annual_insurance: number;
  monthly_pmi: number;
  monthly_hoa: number;
  monthly_rental_income: number;
  loan_term_years: number;
  total_monthly_payment: number;
  dti_status: "under_target" | "over_target" | "needs_numbers";
  dti_status_label: string;
  financing_fit_label: string;
};

export default function PublicShowcasePropertyPage() {
  const { publicToken, propertyId } = useParams<{ publicToken: string; propertyId: string }>();
  const supabase = useMemo(() => createClient(), []);
  const [showcase, setShowcase] = useState<Showcase | null>(null);
  const [property, setProperty] = useState<PublicShowcaseProperty | null>(null);
  const [comments, setComments] = useState<PublicPropertyComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: showcaseData } = await supabase.from("showcases").select("*").eq("public_token", publicToken).eq("is_public", true).single();
      if (!showcaseData) return setLoading(false);
      const { data: linked } = await supabase.from("showcase_properties").select("*").eq("showcase_id", showcaseData.id).eq("property_id", propertyId).single();
      if (!linked) return setLoading(false);
      const { data: propertyData } = await supabase.rpc("get_public_showcase_properties", {
        p_public_token: publicToken,
      });
      const { data: commentData } = await supabase.from("public_property_comments").select("*").eq("showcase_id", showcaseData.id).eq("property_id", propertyId).order("created_at", { ascending: true });
      const publicProperty = ((propertyData ?? []) as PublicShowcaseProperty[]).find((item) => item.property_id === propertyId);
      setShowcase(showcaseData as Showcase);
      setProperty(publicProperty ?? null);
      setComments((commentData ?? []) as PublicPropertyComment[]);
      setLoading(false);
    }
    load();
  }, [propertyId, publicToken, supabase]);

  if (loading) return <LoadingState label="Loading shared property..." />;
  if (!showcase || !property) {
    return <main className="mx-auto max-w-2xl p-8 text-sm text-muted-foreground">This showcase link is invalid or no longer available.</main>;
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Button asChild variant="ghost" className="-ml-3 mb-6">
        <Link href={`/s/${publicToken}`}><ArrowLeft className="h-4 w-4" />Back to showcase</Link>
      </Button>
      <div className="mb-6 flex flex-wrap gap-2">
        <PermissionBadge kind={showcase.access_mode} />
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          Private buyer financials are hidden.
        </span>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">{property.address}</h1>
          <div className="mt-4 flex flex-wrap gap-2">
            <PropertyStageBadge stage={property.stage} />
            <PublicFitBadge status={property.dti_status} label={property.financing_fit_label} />
            <PublicFitBadge status={property.dti_status} label={property.dti_status_label} subtle />
          </div>
        </div>
        {property.listing_url ? (
          <Button asChild variant="outline">
            <a href={property.listing_url} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" />
              View listing
            </a>
          </Button>
        ) : null}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="text-sm font-medium">General notes</p>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">{property.general_notes || "No notes shared."}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Tour notes</p>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">{property.tour_notes || "No tour notes shared."}</p>
              </div>
            </CardContent>
          </Card>
          <PublicCommentsSection showcase={showcase} propertyId={property.property_id} initialComments={comments} />
        </div>
        <aside className="space-y-4">
          <Card className="p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Financing fit</p>
            <p className="mt-2 text-xl font-semibold">{property.financing_fit_label}</p>
            <p className="mt-1 text-sm text-muted-foreground">{property.dti_status_label}</p>
          </Card>
          <PublicMetric label="Price" value={formatCurrency(property.purchase_price)} />
          <PublicMetric label="Total monthly payment" value={formatCurrency(property.total_monthly_payment)} />
          <PublicMetric label="Interest rate" value={formatPercent(property.interest_rate)} />
          <PublicMetric label="Down payment" value={formatPercent(property.down_payment_percent)} />
          <PublicMetric label="Annual taxes" value={formatCurrency(property.annual_taxes)} />
          <PublicMetric label="Annual insurance" value={formatCurrency(property.annual_insurance)} />
          <PublicMetric label="Monthly HOA" value={formatCurrency(property.monthly_hoa)} />
          <PublicMetric label="Monthly PMI" value={formatCurrency(property.monthly_pmi)} />
          <PublicMetric label="Rental income" value={formatCurrency(property.monthly_rental_income)} />
        </aside>
      </div>
    </main>
  );
}

function PublicFitBadge({ status, label, subtle = false }: { status: PublicShowcaseProperty["dti_status"]; label: string; subtle?: boolean }) {
  return (
    <span className={cn(
      "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
      status === "under_target" ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100" : "",
      status === "over_target" ? "border-amber-400/25 bg-amber-400/10 text-amber-100" : "",
      status === "needs_numbers" ? "border-slate-400/25 bg-slate-400/10 text-slate-200" : "",
      subtle ? "opacity-85" : "",
    )}>
      {label}
    </span>
  );
}

function PublicMetric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </Card>
  );
}
