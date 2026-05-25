import { Badge } from "@/components/ui/badge";
import type { PropertyStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const styles: Record<PropertyStatus, string> = {
  "Looks good": "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  "DTI too high": "border-red-400/30 bg-red-400/10 text-red-200",
  "Cash short": "border-amber-400/30 bg-amber-400/10 text-amber-200",
  "Needs numbers": "border-slate-400/25 bg-slate-400/10 text-slate-300",
};

export function StatusBadge({ status, className }: { status: PropertyStatus; className?: string }) {
  return <Badge className={cn(styles[status], className)}>{status}</Badge>;
}
