import { MetricCard } from "@/components/metric-card";
import { formatCurrency } from "@/lib/formatters";
import type { Profile } from "@/lib/types";

export function ProfileSummary({ profile }: { profile: Profile }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Monthly income" value={formatCurrency(profile.monthly_income)} />
      <MetricCard label="Monthly debt" value={formatCurrency(profile.monthly_debt)} />
      <MetricCard label="Cash in hand" value={formatCurrency(profile.cash_on_hand)} />
      <MetricCard label="Target DTI" value="45%" helper="Qualifying income includes 75% of rent." />
    </div>
  );
}
