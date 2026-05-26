"use client";

import { propertyStageLabels } from "@/components/property-stage-badge";
import type { PropertyStage } from "@/lib/types";

export function PropertyStageSelect({
  value,
  onChange,
  disabled,
}: {
  value?: PropertyStage | null;
  onChange: (value: PropertyStage) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={value ?? "just_interested"}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as PropertyStage)}
      className="h-9 rounded-md border border-white/10 bg-white/[0.04] px-2.5 text-xs text-slate-100 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      aria-label="Deal stage"
    >
      {Object.entries(propertyStageLabels).map(([stage, label]) => (
        <option key={stage} value={stage} className="bg-slate-950 text-slate-100">
          {label}
        </option>
      ))}
    </select>
  );
}
