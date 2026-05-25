"use client";

import { cn } from "@/lib/utils";

type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
};

export function Switch({ checked, onCheckedChange, id }: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative h-6 w-11 rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        checked ? "border-emerald-400/50 bg-emerald-400/70" : "border-white/15 bg-white/10",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition",
          checked ? "left-5" : "left-0.5",
        )}
      />
    </button>
  );
}
