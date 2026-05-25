import Link from "next/link";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { calculateMortgage, getPropertyStatus, mortgageInputsFrom } from "@/lib/calculations";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import type { Profile, Property } from "@/lib/types";

export function PropertyCard({ property, profile }: { property: Property; profile: Profile }) {
  const results = calculateMortgage(mortgageInputsFrom(profile, property));
  const status = getPropertyStatus(results);
  const preview = property.general_notes?.trim().split("\n")[0] || "No notes yet.";

  return (
    <Link href={`/properties/${property.id}`} className="group block">
      <Card className="h-full p-5 transition hover:border-emerald-400/30 hover:bg-card">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold">{property.address}</h3>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{preview}</p>
          </div>
          <ArrowUpRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:text-emerald-200" />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <StatusBadge status={status} />
          {property.listing_url ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-blue-400/25 bg-blue-400/10 px-2.5 py-1 text-xs font-medium text-blue-200">
              <ExternalLink className="h-3 w-3" />
              Listing saved
            </span>
          ) : null}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">Monthly</p>
            <p className="mt-1 font-medium">{formatCurrency(results.total_monthly_payment)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">DTI</p>
            <p className="mt-1 font-medium">{formatPercent(results.dti_percent)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Cash to close</p>
            <p className="mt-1 font-medium">{formatCurrency(results.cash_to_close)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Remaining</p>
            <p className="mt-1 font-medium">{formatCurrency(results.remaining_cash_after_close)}</p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
