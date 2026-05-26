"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Eye, Home, LayoutGrid, List, MessageSquare, ShieldCheck } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { PermissionBadge } from "@/components/permission-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PropertyStageBadge } from "@/components/property-stage-badge";
import { createClient } from "@/lib/supabase/client";
import type { Showcase } from "@/lib/types";
import type { PropertyStage } from "@/lib/types";
import { formatCurrency } from "@/lib/formatters";
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
  purchase_price: number;
  annual_taxes: number;
  annual_insurance: number;
  monthly_hoa: number;
  monthly_pmi: number;
  monthly_rental_income: number;
  total_monthly_payment: number;
  dti_status: "under_target" | "over_target" | "needs_numbers";
  dti_status_label: string;
  financing_fit_label: string;
};

export default function PublicShowcasePage() {
  const { publicToken } = useParams<{ publicToken: string }>();
  const supabase = useMemo(() => createClient(), []);
  const [showcase, setShowcase] = useState<Showcase | null>(null);
  const [properties, setProperties] = useState<PublicShowcaseProperty[]>([]);
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: showcaseData } = await supabase
        .from("showcases")
        .select("*")
        .eq("public_token", publicToken)
        .eq("is_public", true)
        .single();
      if (!showcaseData) {
        setLoading(false);
        return;
      }
      const { data: propertyData } = await supabase.rpc("get_public_showcase_properties", {
        p_public_token: publicToken,
      });
      setShowcase(showcaseData as Showcase);
      setProperties((propertyData ?? []) as PublicShowcaseProperty[]);
      setLoading(false);
    }
    load();
  }, [publicToken, supabase]);

  if (loading) return <LoadingState label="Loading shared showcase..." />;
  if (!showcase) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-4">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-semibold">This showcase link is invalid or no longer available.</h1>
          <p className="mt-3 text-sm text-muted-foreground">Ask the owner for a fresh WorthTheHouse share link.</p>
        </Card>
      </main>
    );
  }

  const totalPages = Math.max(1, Math.ceil(properties.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visibleProperties = properties.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <main className="min-h-screen">
      <section className="border-b border-white/10 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-4 flex flex-wrap gap-2">
            <PermissionBadge kind={showcase.access_mode} />
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              Private buyer financials are hidden from this shared view.
            </span>
          </div>
          <p className="text-sm font-medium text-emerald-200">WorthTheHouse · Shared Showcase</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal sm:text-5xl">{showcase.name}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">{showcase.description}</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-1">
            <Button type="button" variant={viewMode === "cards" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("cards")}>
              <LayoutGrid className="h-4 w-4" />
              Cards
            </Button>
            <Button type="button" variant={viewMode === "list" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("list")}>
              <List className="h-4 w-4" />
              List
            </Button>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Show</span>
            {[10, 20].map((size) => (
              <Button key={size} type="button" variant={pageSize === size ? "secondary" : "ghost"} size="sm" onClick={() => { setPageSize(size); setPage(1); }}>
                {size}
              </Button>
            ))}
          </div>
        </div>

        {viewMode === "cards" ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleProperties.map((property) => <PublicCard key={property.property_id} property={property} publicToken={publicToken} commentsEnabled={showcase.access_mode === "can_comment"} />)}
          </div>
        ) : (
          <Card className="overflow-hidden">
            <div className="divide-y divide-white/10">
              {visibleProperties.map((property) => {
                const expanded = expandedId === property.property_id;
                return (
                  <div key={property.property_id} className="bg-card/40">
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : property.property_id)}
                      className="grid w-full gap-3 px-4 py-4 text-left transition hover:bg-white/[0.03] md:grid-cols-[minmax(0,1.6fr)_130px_130px_130px_40px] md:items-center"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-100">{property.address}</p>
                        <p className="mt-1 truncate text-sm text-muted-foreground">{property.general_notes || "No notes yet."}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <PropertyStageBadge stage={property.stage} />
                        <PublicFitBadge status={property.dti_status} label={property.financing_fit_label} />
                      </div>
                      <Recap label="Monthly" value={formatCurrency(property.total_monthly_payment)} />
                      <Recap label="Price" value={formatCurrency(property.purchase_price)} />
                      <ChevronDown className={cn("h-5 w-5 justify-self-end text-muted-foreground transition", expanded ? "rotate-180 text-emerald-200" : "")} />
                    </button>

                    {expanded ? (
                      <div className="grid gap-4 border-t border-white/10 bg-black/15 px-4 py-4 md:grid-cols-[minmax(0,1fr)_220px]">
                        <p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">{property.general_notes || "No notes yet."}</p>
                        <div className="space-y-3">
                          <Recap label="DTI status" value={property.dti_status_label} />
                          <Recap label="Annual taxes" value={formatCurrency(property.annual_taxes)} />
                          <Button asChild className="w-full">
                            <Link href={`/s/${publicToken}/properties/${property.property_id}`}>View details</Link>
                          </Button>
                          {property.listing_url ? (
                            <Button asChild variant="outline" className="w-full">
                              <a href={property.listing_url} target="_blank" rel="noreferrer">
                                <ExternalLink className="h-4 w-4" />
                                View listing
                              </a>
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, properties.length)} of {properties.length}
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={safePage === 1}>
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="min-w-16 text-center text-sm text-muted-foreground">{safePage} / {totalPages}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={safePage === totalPages}>
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}

function PublicCard({ property, publicToken, commentsEnabled }: { property: PublicShowcaseProperty; publicToken: string; commentsEnabled: boolean }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{property.address}</h2>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{property.general_notes || "No notes yet."}</p>
        </div>
        <Home className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <PropertyStageBadge stage={property.stage} />
        <PublicFitBadge status={property.dti_status} label={property.financing_fit_label} />
        <span className={cn(
          "rounded-full border px-2.5 py-1 text-xs font-medium",
          property.dti_status === "under_target" ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100" : "",
          property.dti_status === "over_target" ? "border-amber-400/25 bg-amber-400/10 text-amber-100" : "",
          property.dti_status === "needs_numbers" ? "border-slate-400/25 bg-slate-400/10 text-slate-200" : "",
        )}>
          {property.dti_status_label}
        </span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <Recap label="Price" value={formatCurrency(property.purchase_price)} />
        <Recap label="Total monthly" value={formatCurrency(property.total_monthly_payment)} />
        <Recap label="Taxes" value={formatCurrency(property.annual_taxes)} />
        <Recap label="Rental income" value={formatCurrency(property.monthly_rental_income)} />
      </div>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Button asChild className="flex-1">
          <Link href={`/s/${publicToken}/properties/${property.property_id}`}><Eye className="h-4 w-4" />View details</Link>
        </Button>
        {property.listing_url ? (
          <Button asChild variant="outline" className="flex-1">
            <a href={property.listing_url} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" />
              View listing
            </a>
          </Button>
        ) : null}
        {commentsEnabled ? <MessageSquare className="self-center text-amber-200 sm:h-4 sm:w-4" /> : null}
      </div>
    </Card>
  );
}

function PublicFitBadge({ status, label }: { status: PublicShowcaseProperty["dti_status"]; label: string }) {
  return (
    <span className={cn(
      "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
      status === "under_target" ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100" : "",
      status === "over_target" ? "border-amber-400/25 bg-amber-400/10 text-amber-100" : "",
      status === "needs_numbers" ? "border-slate-400/25 bg-slate-400/10 text-slate-200" : "",
    )}>
      {label}
    </span>
  );
}

function Recap({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-medium text-slate-100">{value}</p>
    </div>
  );
}
