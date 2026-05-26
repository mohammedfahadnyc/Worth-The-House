import { Badge } from "@/components/ui/badge";
import type { PropertyStage } from "@/lib/types";
import { cn } from "@/lib/utils";

export const propertyStageLabels: Record<PropertyStage, string> = {
  just_interested: "Just interested",
  offer_placed: "Offer placed",
  toured: "Toured",
  under_contract: "Under contract",
  fell_through: "Fell through",
};

const styles: Record<PropertyStage, string> = {
  just_interested: "border-slate-400/25 bg-slate-400/10 text-slate-200",
  offer_placed: "border-blue-400/25 bg-blue-400/10 text-blue-100",
  toured: "border-violet-400/25 bg-violet-400/10 text-violet-100",
  under_contract: "border-emerald-400/25 bg-emerald-400/10 text-emerald-100",
  fell_through: "border-red-400/25 bg-red-400/10 text-red-100",
};

export function PropertyStageBadge({
  stage,
  className,
}: {
  stage?: PropertyStage | null;
  className?: string;
}) {
  const safeStage = stage ?? "just_interested";
  return <Badge className={cn(styles[safeStage], className)}>{propertyStageLabels[safeStage]}</Badge>;
}
