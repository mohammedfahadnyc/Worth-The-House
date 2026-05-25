"use client";

import { useMemo, useState } from "react";
import { Save } from "lucide-react";
import { DtiFixer } from "@/components/dti-fixer";
import { MetricCard } from "@/components/metric-card";
import { MoneyInput } from "@/components/money-input";
import { PercentageInput } from "@/components/percentage-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateMortgage, mortgageInputsFrom, TARGET_DTI } from "@/lib/calculations";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import type { Profile, Property } from "@/lib/types";

type MortgageField =
  | "purchase_price"
  | "interest_rate"
  | "down_payment_percent"
  | "annual_taxes"
  | "annual_insurance"
  | "monthly_pmi"
  | "monthly_hoa"
  | "monthly_rental_income"
  | "loan_term_years"
  | "closing_cost_percent"
  | "repair_reserve";

export function MortgageCalculator({
  profile,
  property,
  onSave,
}: {
  profile: Profile;
  property: Property;
  onSave: (values: Pick<Property, MortgageField>) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Pick<Property, MortgageField>>({
    purchase_price: property.purchase_price,
    interest_rate: property.interest_rate,
    down_payment_percent: property.down_payment_percent,
    annual_taxes: property.annual_taxes,
    annual_insurance: property.annual_insurance,
    monthly_pmi: property.monthly_pmi,
    monthly_hoa: property.monthly_hoa,
    monthly_rental_income: property.monthly_rental_income,
    loan_term_years: property.loan_term_years,
    closing_cost_percent: property.closing_cost_percent,
    repair_reserve: property.repair_reserve,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const inputs = useMemo(() => mortgageInputsFrom(profile, { ...property, ...draft }), [profile, property, draft]);
  const results = useMemo(() => calculateMortgage(inputs), [inputs]);

  function update(field: MortgageField, value: number) {
    setDraft((current) => ({ ...current, [field]: Number.isFinite(value) ? value : 0 }));
  }

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      await onSave(draft);
      setMessage("Saved");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save mortgage assumptions.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mortgage Math</CardTitle>
          <CardDescription>Adjust the acquisition assumptions for this property.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <MoneyInput label="Purchase price" value={draft.purchase_price} onChange={(value) => update("purchase_price", value)} />
            <PercentageInput label="Down payment percentage" value={draft.down_payment_percent} onChange={(value) => update("down_payment_percent", value)} />
            <PercentageInput label="Interest rate" value={draft.interest_rate} onChange={(value) => update("interest_rate", value)} />
            <div className="space-y-2">
              <Label htmlFor="loan-term">Loan term years</Label>
              <Input
                id="loan-term"
                type="number"
                min="1"
                value={draft.loan_term_years}
                onChange={(event) => update("loan_term_years", Number(event.target.value))}
              />
            </div>
            <MoneyInput label="Annual property taxes" value={draft.annual_taxes} onChange={(value) => update("annual_taxes", value)} />
            <MoneyInput label="Annual insurance" value={draft.annual_insurance} onChange={(value) => update("annual_insurance", value)} />
            <MoneyInput label="Monthly PMI" value={draft.monthly_pmi} onChange={(value) => update("monthly_pmi", value)} />
            <MoneyInput label="Monthly HOA" value={draft.monthly_hoa} onChange={(value) => update("monthly_hoa", value)} />
            <MoneyInput label="Monthly rental income" value={draft.monthly_rental_income} onChange={(value) => update("monthly_rental_income", value)} />
            <PercentageInput label="Estimated closing cost percentage" value={draft.closing_cost_percent} onChange={(value) => update("closing_cost_percent", value)} />
            <MoneyInput label="Estimated repair/reserve cash" value={draft.repair_reserve} onChange={(value) => update("repair_reserve", value)} />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save mortgage assumptions"}
            </Button>
            {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Loan amount" value={formatCurrency(results.loan_amount)} />
        <MetricCard label="Down payment" value={formatCurrency(results.down_payment_amount)} />
        <MetricCard label="Principal + interest" value={formatCurrency(results.monthly_PI)} />
        <MetricCard label="Total monthly payment" value={formatCurrency(results.total_monthly_payment)} />
        <MetricCard label="Usable rental income" value={formatCurrency(results.usable_rental_income)} helper="75% of projected rent." />
        <MetricCard
          label="DTI"
          value={formatPercent(results.dti_percent)}
          helper="Target is 45%."
          emphasis={results.dti <= TARGET_DTI ? "good" : "danger"}
        />
        <MetricCard label="Cash to close" value={formatCurrency(results.cash_to_close)} />
        <MetricCard
          label="Remaining cash"
          value={formatCurrency(results.remaining_cash_after_close)}
          emphasis={results.remaining_cash_after_close >= 0 ? "good" : "danger"}
        />
      </div>

      <DtiFixer inputs={inputs} />
    </div>
  );
}
