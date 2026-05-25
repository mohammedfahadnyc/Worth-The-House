"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PercentageInputProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  id?: string;
};

export function PercentageInput({ label, value, onChange, id }: PercentageInputProps) {
  const displayValue = Number.isFinite(value) && value !== 0 ? value : "";

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min="0"
        step="0.1"
        value={displayValue}
        onChange={(event) => onChange(event.target.value === "" ? 0 : Number(event.target.value))}
      />
    </div>
  );
}
