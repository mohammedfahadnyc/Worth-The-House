import type {
  DtiFixerResults,
  MortgageInputs,
  MortgageResults,
  Profile,
  Property,
  PropertyStatus,
} from "@/lib/types";

export const TARGET_DTI = 0.45;

const n = (value: number | string | null | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function calculateMortgage(inputs: MortgageInputs): MortgageResults {
  const purchase_price = n(inputs.purchase_price);
  const down_payment_percent = Math.min(100, Math.max(0, n(inputs.down_payment_percent)));
  const down_payment_amount = (purchase_price * down_payment_percent) / 100;
  const loan_amount = Math.max(0, purchase_price - down_payment_amount);
  const monthly_rate = n(inputs.interest_rate) / 100 / 12;
  const months = Math.max(1, n(inputs.loan_term_years) * 12);

  const monthly_PI =
    monthly_rate > 0
      ? (loan_amount * monthly_rate * Math.pow(1 + monthly_rate, months)) /
        (Math.pow(1 + monthly_rate, months) - 1)
      : loan_amount / months;

  const monthly_taxes = n(inputs.annual_taxes) / 12;
  const monthly_insurance = n(inputs.annual_insurance) / 12;
  const monthly_pmi = n(inputs.monthly_pmi);
  const monthly_hoa = n(inputs.monthly_hoa);
  const total_monthly_payment =
    monthly_PI + monthly_taxes + monthly_insurance + monthly_pmi + monthly_hoa;

  const monthly_rental_income = n(inputs.monthly_rental_income);
  const usable_rental_income = monthly_rental_income * 0.75;
  const dti_income = n(inputs.monthly_income) + usable_rental_income;
  const dti_debt = n(inputs.monthly_debt) + total_monthly_payment;
  const dti = dti_income > 0 ? dti_debt / dti_income : 0;
  const closing_costs = (purchase_price * n(inputs.closing_cost_percent)) / 100;
  const cash_to_close = down_payment_amount + closing_costs + n(inputs.repair_reserve);
  const remaining_cash_after_close = n(inputs.cash_on_hand) - cash_to_close;

  return {
    purchase_price,
    down_payment_amount,
    loan_amount,
    monthly_PI,
    monthly_taxes,
    monthly_insurance,
    monthly_pmi,
    monthly_hoa,
    total_monthly_payment,
    monthly_rental_income,
    usable_rental_income,
    dti_income,
    dti_debt,
    dti,
    dti_percent: dti * 100,
    closing_costs,
    cash_to_close,
    remaining_cash_after_close,
  };
}

export function mortgageInputsFrom(profile: Profile, property: Property): MortgageInputs {
  return {
    monthly_income: profile.monthly_income,
    monthly_debt: profile.monthly_debt,
    cash_on_hand: profile.cash_on_hand,
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
  };
}

export function getPropertyStatus(results: MortgageResults): PropertyStatus {
  if (results.purchase_price <= 0) return "Needs numbers";
  if (results.dti > TARGET_DTI) return "DTI too high";
  if (results.remaining_cash_after_close < 0) return "Cash short";
  return "Looks good";
}

export function calculateDtiFixer(inputs: MortgageInputs): DtiFixerResults {
  const current = calculateMortgage(inputs);
  const max_allowed_debt = current.dti_income * TARGET_DTI;
  const required_debt_reduction = Math.max(0, current.dti_debt - max_allowed_debt);
  const required_income = current.dti_debt / TARGET_DTI;
  const required_income_increase = Math.max(0, required_income - current.dti_income);

  let required_down_payment_percent: number | null = null;
  let required_down_payment_amount: number | null = null;

  for (
    let percent = Math.max(0, n(inputs.down_payment_percent));
    percent <= 100.0001;
    percent += 0.5
  ) {
    const simulated = calculateMortgage({ ...inputs, down_payment_percent: percent });
    if (simulated.dti <= TARGET_DTI) {
      required_down_payment_percent = Math.min(100, percent);
      required_down_payment_amount = simulated.down_payment_amount;
      break;
    }
  }

  const additional_cash_needed =
    required_down_payment_amount === null
      ? null
      : Math.max(0, required_down_payment_amount - current.down_payment_amount);

  return {
    max_allowed_debt,
    required_debt_reduction,
    required_income,
    required_income_increase,
    required_down_payment_percent,
    required_down_payment_amount,
    additional_cash_needed,
    possible_by_down_payment_alone: required_down_payment_percent !== null,
  };
}

export function calculateAdjustedScenario(
  inputs: MortgageInputs,
  extraCash: number,
  monthlyDebtPayoff: number,
) {
  const current = calculateMortgage(inputs);
  const adjustedDownPaymentAmount = Math.min(
    n(inputs.purchase_price),
    current.down_payment_amount + Math.max(0, n(extraCash)),
  );
  const adjustedDownPaymentPercent =
    n(inputs.purchase_price) > 0 ? (adjustedDownPaymentAmount / n(inputs.purchase_price)) * 100 : 0;

  return calculateMortgage({
    ...inputs,
    down_payment_percent: adjustedDownPaymentPercent,
    monthly_debt: Math.max(0, n(inputs.monthly_debt) - Math.max(0, n(monthlyDebtPayoff))),
  });
}
