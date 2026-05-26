"use client";

import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronRight, ExternalLink, LayoutGrid, List } from "lucide-react";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { calculateMortgage, getPropertyStatus, mortgageInputsFrom } from "@/lib/calculations";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import type { Profile, Property } from "@/lib/types";
import { cn } from "@/lib/utils";

type PropertyListProps = {
  profile: Profile;
  properties: Property[];
  viewMode: "cards" | "list";
  onViewModeChange: (mode: "cards" | "list") => void;
  renderCards: (visibleProperties: Property[]) => React.ReactNode;
};

export function PropertyList({
  profile,
  properties,
  viewMode,
  onViewModeChange,
  renderCards,
}: PropertyListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(properties.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const visibleProperties = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return properties.slice(start, start + pageSize);
  }, [properties, safePage, pageSize]);

  function changePageSize(size: number) {
    setPageSize(size);
    setPage(1);
    setExpandedId(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-1">
          <Button
            type="button"
            variant={viewMode === "cards" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange("cards")}
          >
            <LayoutGrid className="h-4 w-4" />
            Cards
          </Button>
          <Button
            type="button"
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange("list")}
          >
            <List className="h-4 w-4" />
            List
          </Button>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Show</span>
          {[10, 20].map((size) => (
            <Button
              key={size}
              type="button"
              variant={pageSize === size ? "secondary" : "ghost"}
              size="sm"
              onClick={() => changePageSize(size)}
            >
              {size}
            </Button>
          ))}
        </div>
      </div>

      {viewMode === "cards" ? (
        renderCards(visibleProperties)
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-white/10">
            {visibleProperties.map((property) => {
              const results = calculateMortgage(mortgageInputsFrom(profile, property));
              const status = getPropertyStatus(results);
              const expanded = expandedId === property.id;
              const preview = property.general_notes?.trim().split("\n")[0] || "No notes yet.";

              return (
                <div key={property.id} className="bg-card/40">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : property.id)}
                    className="grid w-full gap-3 px-4 py-4 text-left transition hover:bg-white/[0.03] md:grid-cols-[minmax(0,1.6fr)_120px_120px_130px_130px_40px] md:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-100">{property.address}</p>
                      <p className="mt-1 truncate text-sm text-muted-foreground">{preview}</p>
                    </div>
                    <div className="flex md:block">
                      <StatusBadge status={status} />
                    </div>
                    <Recap label="Monthly" value={formatCurrency(results.total_monthly_payment)} />
                    <Recap label="DTI" value={formatPercent(results.dti_percent)} />
                    <Recap label="Cash close" value={formatCurrency(results.cash_to_close)} />
                    <ChevronDown
                      className={cn(
                        "h-5 w-5 justify-self-end text-muted-foreground transition",
                        expanded ? "rotate-180 text-emerald-200" : "",
                      )}
                    />
                  </button>

                  {expanded ? (
                    <div className="grid gap-4 border-t border-white/10 bg-black/15 px-4 py-4 md:grid-cols-[minmax(0,1fr)_220px]">
                      <div>
                        <p className="text-sm font-medium text-slate-200">Quick notes</p>
                        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">
                          {property.general_notes?.trim() || "No notes yet."}
                        </p>
                      </div>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <Recap label="Remaining" value={formatCurrency(results.remaining_cash_after_close)} />
                          <Recap label="Loan" value={formatCurrency(results.loan_amount)} />
                        </div>
                        <Button asChild className="w-full">
                          <Link href={`/properties/${property.id}`}>Open property</Link>
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {(safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, properties.length)} of{" "}
          {properties.length}
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={safePage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="min-w-16 text-center text-sm text-muted-foreground">
            {safePage} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={safePage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
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
