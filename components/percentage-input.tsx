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
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min="0"
        step="0.1"
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}
