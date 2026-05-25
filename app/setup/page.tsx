"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LoadingState } from "@/components/loading-state";
import { MoneyInput } from "@/components/money-input";
import { PercentageInput } from "@/components/percentage-input";
import { ensureProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

type SetupDraft = Pick<
  Profile,
  | "monthly_income"
  | "monthly_debt"
  | "cash_on_hand"
  | "use_default_house_data"
  | "default_purchase_price"
  | "default_interest_rate"
  | "default_down_payment_percent"
  | "default_annual_taxes"
  | "default_annual_insurance"
  | "default_monthly_pmi"
  | "default_monthly_hoa"
  | "default_monthly_rental_income"
  | "default_loan_term_years"
  | "default_closing_cost_percent"
  | "default_repair_reserve"
>;

export default function SetupPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [profileId, setProfileId] = useState("");
  const [draft, setDraft] = useState<SetupDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return router.replace("/login");
      try {
        const data = await ensureProfile(supabase, auth.user);
        setProfileId(auth.user.id);
        setDraft(data as Profile);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Profile not found.");
      }
      setLoading(false);
    }
    load();
  }, [router, supabase]);

  function update<K extends keyof SetupDraft>(key: K, value: SetupDraft[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    setError("");
    const { error: saveError } = await supabase
      .from("profiles")
      .update({ ...draft, setup_complete: true })
      .eq("id", profileId);
    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    router.replace("/dashboard");
  }

  if (loading || !draft) return <LoadingState label="Preparing setup..." />;

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-4 py-10 sm:px-6">
      <div className="mb-8">
        <p className="text-sm font-medium text-emerald-200">Setup</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal sm:text-4xl">Your buying power</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Set your baseline finances once, then reuse them across every property you analyze.
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Your buying power</CardTitle>
            <CardDescription>These values drive DTI and cash-to-close calculations.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <MoneyInput label="Monthly income" value={draft.monthly_income} onChange={(value) => update("monthly_income", value)} />
            <MoneyInput label="Monthly debt" value={draft.monthly_debt} onChange={(value) => update("monthly_debt", value)} />
            <MoneyInput label="Cash in hand" value={draft.cash_on_hand} onChange={(value) => update("cash_on_hand", value)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Default house assumptions</CardTitle>
                <CardDescription>
                  These defaults will prefill every property you add. You can adjust each property later.
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="defaults">Use defaults</Label>
                <Switch
                  id="defaults"
                  checked={draft.use_default_house_data}
                  onCheckedChange={(checked) => update("use_default_house_data", checked)}
                />
              </div>
            </div>
          </CardHeader>
          {draft.use_default_house_data ? (
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <MoneyInput label="Default purchase price" value={draft.default_purchase_price} onChange={(value) => update("default_purchase_price", value)} />
              <PercentageInput label="Default interest rate" value={draft.default_interest_rate} onChange={(value) => update("default_interest_rate", value)} />
              <PercentageInput label="Default down payment %" value={draft.default_down_payment_percent} onChange={(value) => update("default_down_payment_percent", value)} />
              <MoneyInput label="Default annual taxes" value={draft.default_annual_taxes} onChange={(value) => update("default_annual_taxes", value)} />
              <MoneyInput label="Default annual insurance" value={draft.default_annual_insurance} onChange={(value) => update("default_annual_insurance", value)} />
              <MoneyInput label="Default monthly PMI" value={draft.default_monthly_pmi} onChange={(value) => update("default_monthly_pmi", value)} />
              <MoneyInput label="Default monthly HOA" value={draft.default_monthly_hoa} onChange={(value) => update("default_monthly_hoa", value)} />
              <MoneyInput label="Default monthly rental income" value={draft.default_monthly_rental_income} onChange={(value) => update("default_monthly_rental_income", value)} />
              <div className="space-y-2">
                <Label htmlFor="default-term">Default loan term years</Label>
                <Input id="default-term" type="number" min="1" value={draft.default_loan_term_years > 0 ? draft.default_loan_term_years : ""} onChange={(event) => update("default_loan_term_years", event.target.value === "" ? 0 : Number(event.target.value))} />
              </div>
              <PercentageInput label="Default closing cost %" value={draft.default_closing_cost_percent} onChange={(value) => update("default_closing_cost_percent", value)} />
              <MoneyInput label="Default repair reserve" value={draft.default_repair_reserve} onChange={(value) => update("default_repair_reserve", value)} />
            </CardContent>
          ) : null}
        </Card>

        {error ? <p className="rounded-md border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p> : null}
        <Button onClick={save} disabled={saving} size="lg" className="w-full sm:w-fit">
          {saving ? "Saving..." : "Save and continue"}
        </Button>
      </div>
    </main>
  );
}
