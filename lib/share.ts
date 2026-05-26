import { calculateMortgage, mortgageInputsFrom, TARGET_DTI } from "@/lib/calculations";
import type { Profile, Property } from "@/lib/types";

export function generatePublicToken() {
  return crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().slice(0, 8);
}

export function getPublicPropertySummary(property: Property, ownerProfile?: Profile | null) {
  const purchasePrice = Number(property.purchase_price ?? 0);
  if (!ownerProfile || purchasePrice <= 0) {
    return {
      dtiStatus: "needs_numbers" as const,
      dtiStatusLabel: "Needs numbers",
      financingFit: "needs_numbers" as const,
      financingFitLabel: "Needs numbers",
      total_monthly_payment: 0,
      purchase_price: purchasePrice,
      annual_taxes: Number(property.annual_taxes ?? 0),
      annual_insurance: Number(property.annual_insurance ?? 0),
      monthly_hoa: Number(property.monthly_hoa ?? 0),
      monthly_pmi: Number(property.monthly_pmi ?? 0),
      monthly_rental_income: Number(property.monthly_rental_income ?? 0),
      interest_rate: Number(property.interest_rate ?? 0),
      down_payment_percent: Number(property.down_payment_percent ?? 0),
      loan_term_years: Number(property.loan_term_years ?? 0),
    };
  }

  const results = calculateMortgage(mortgageInputsFrom(ownerProfile, property));
  const underTarget = results.dti <= TARGET_DTI;

  return {
    dtiStatus: underTarget ? ("under_target" as const) : ("over_target" as const),
    dtiStatusLabel: underTarget ? "DTI under 45%" : "DTI over 45%",
    financingFit: underTarget ? ("looks_workable" as const) : ("review_dti" as const),
    financingFitLabel: underTarget ? "Looks workable" : "Review DTI",
    total_monthly_payment: results.total_monthly_payment,
    purchase_price: purchasePrice,
    annual_taxes: Number(property.annual_taxes ?? 0),
    annual_insurance: Number(property.annual_insurance ?? 0),
    monthly_hoa: Number(property.monthly_hoa ?? 0),
    monthly_pmi: Number(property.monthly_pmi ?? 0),
    monthly_rental_income: Number(property.monthly_rental_income ?? 0),
    interest_rate: Number(property.interest_rate ?? 0),
    down_payment_percent: Number(property.down_payment_percent ?? 0),
    loan_term_years: Number(property.loan_term_years ?? 0),
  };
}
