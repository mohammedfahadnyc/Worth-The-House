import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  label: string;
  value: string;
  helper?: string;
  emphasis?: "default" | "good" | "warn" | "danger";
};

const valueStyles = {
  default: "text-slate-50",
  good: "text-emerald-200",
  warn: "text-amber-200",
  danger: "text-red-200",
};

export function MetricCard({ label, value, helper, emphasis = "default" }: MetricCardProps) {
  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className={cn("mt-3 text-2xl font-semibold tracking-normal", valueStyles[emphasis])}>
        {value}
      </p>
      {helper ? <p className="mt-2 text-sm leading-5 text-muted-foreground">{helper}</p> : null}
    </Card>
  );
}
