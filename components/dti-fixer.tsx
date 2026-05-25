"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { MoneyInput } from "@/components/money-input";
import { MetricCard } from "@/components/metric-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TARGET_DTI, calculateAdjustedScenario, calculateDtiFixer, calculateMortgage } from "@/lib/calculations";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import type { MortgageInputs } from "@/lib/types";

export function DtiFixer({ inputs }: { inputs: MortgageInputs }) {
  const [extraCash, setExtraCash] = useState(0);
  const [debtPayoff, setDebtPayoff] = useState(0);
  const results = useMemo(() => calculateMortgage(inputs), [inputs]);
  const fixer = useMemo(() => calculateDtiFixer(inputs), [inputs]);
  const adjusted = useMemo(
    () => calculateAdjustedScenario(inputs, extraCash, debtPayoff),
    [inputs, extraCash, debtPayoff],
  );

  if (results.dti <= TARGET_DTI) {
    return (
      <Card className="border-emerald-400/20 bg-emerald-400/[0.06]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-100">
            <CheckCircle2 className="h-5 w-5" />
            Under target
          </CardTitle>
          <CardDescription>
            This deal is under the 45% DTI target based on your current assumptions.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-amber-400/20 bg-amber-400/[0.04]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-200" />
          What needs to change?
        </CardTitle>
        <CardDescription>
          DTI is above the 45% target. Here is the simple pressure test.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Reduce monthly debt by"
            value={formatCurrency(fixer.required_debt_reduction)}
            emphasis="warn"
          />
          <MetricCard
            label="Increase income by"
            value={formatCurrency(fixer.required_income_increase)}
            emphasis="warn"
          />
          <MetricCard
            label="Down payment fix"
            value={
              fixer.possible_by_down_payment_alone && fixer.required_down_payment_percent !== null
                ? formatPercent(fixer.required_down_payment_percent)
                : "Not enough"
            }
            helper={
              fixer.possible_by_down_payment_alone && fixer.required_down_payment_amount !== null
                ? `${formatCurrency(fixer.required_down_payment_amount)} total, ${formatCurrency(fixer.additional_cash_needed)} more cash`
                : "Even 100% down does not solve DTI because taxes, insurance, HOA, or existing monthly debt are too high."
            }
            emphasis="warn"
          />
        </div>

        <div className="grid gap-4 rounded-lg border border-white/10 bg-black/15 p-4 md:grid-cols-2">
          <MoneyInput label="Extra cash I am willing to put down" value={extraCash} onChange={setExtraCash} />
          <MoneyInput label="Monthly debt I can pay off" value={debtPayoff} onChange={setDebtPayoff} />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard
            label="Adjusted DTI"
            value={formatPercent(adjusted.dti_percent)}
            emphasis={adjusted.dti <= TARGET_DTI ? "good" : "danger"}
          />
          <MetricCard label="Adjusted payment" value={formatCurrency(adjusted.total_monthly_payment)} />
          <MetricCard label="Adjusted cash to close" value={formatCurrency(adjusted.cash_to_close)} />
          <MetricCard
            label="Target reached"
            value={adjusted.dti <= TARGET_DTI ? "Yes" : "No"}
            emphasis={adjusted.dti <= TARGET_DTI ? "good" : "danger"}
          />
        </div>
      </CardContent>
    </Card>
  );
}
