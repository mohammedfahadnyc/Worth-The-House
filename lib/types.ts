export type Profile = {
  id: string;
  username: string;
  monthly_income: number;
  monthly_debt: number;
  cash_on_hand: number;
  setup_complete: boolean;
  use_default_house_data: boolean;
  default_purchase_price: number;
  default_interest_rate: number;
  default_down_payment_percent: number;
  default_annual_taxes: number;
  default_annual_insurance: number;
  default_monthly_pmi: number;
  default_monthly_hoa: number;
  default_monthly_rental_income: number;
  default_loan_term_years: number;
  default_closing_cost_percent: number;
  default_repair_reserve: number;
  created_at: string;
  updated_at: string;
};

export type Property = {
  id: string;
  user_id: string;
  dashboard_visible?: boolean;
  stage: PropertyStage;
  address: string;
  listing_url: string;
  general_notes: string;
  tour_notes: string;
  purchase_price: number;
  interest_rate: number;
  down_payment_percent: number;
  annual_taxes: number;
  annual_insurance: number;
  monthly_pmi: number;
  monthly_hoa: number;
  monthly_rental_income: number;
  loan_term_years: number;
  closing_cost_percent: number;
  repair_reserve: number;
  created_at: string;
  updated_at: string;
};

export type MortgageInputs = {
  monthly_income: number;
  monthly_debt: number;
  cash_on_hand: number;
  purchase_price: number;
  interest_rate: number;
  down_payment_percent: number;
  annual_taxes: number;
  annual_insurance: number;
  monthly_pmi: number;
  monthly_hoa: number;
  monthly_rental_income: number;
  loan_term_years: number;
  closing_cost_percent: number;
  repair_reserve: number;
};

export type MortgageResults = {
  purchase_price: number;
  down_payment_amount: number;
  loan_amount: number;
  monthly_PI: number;
  monthly_taxes: number;
  monthly_insurance: number;
  monthly_pmi: number;
  monthly_hoa: number;
  total_monthly_payment: number;
  monthly_rental_income: number;
  usable_rental_income: number;
  dti_income: number;
  dti_debt: number;
  dti: number;
  dti_percent: number;
  closing_costs: number;
  cash_to_close: number;
  remaining_cash_after_close: number;
};

export type DtiFixerResults = {
  max_allowed_debt: number;
  required_debt_reduction: number;
  required_income: number;
  required_income_increase: number;
  required_down_payment_percent: number | null;
  required_down_payment_amount: number | null;
  additional_cash_needed: number | null;
  possible_by_down_payment_alone: boolean;
};

export type PropertyStatus =
  | "Needs numbers"
  | "DTI too high"
  | "Cash short"
  | "Looks good";

export type PropertyStage =
  | "just_interested"
  | "offer_placed"
  | "toured"
  | "under_contract"
  | "fell_through";

export type DealRoom = {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
};

export type DealRoomMember = {
  id: string;
  deal_room_id: string;
  user_id: string;
  role: "collaborator";
  created_at: string;
};

export type DealRoomProperty = {
  id: string;
  deal_room_id: string;
  property_id: string;
  added_by: string | null;
  created_at: string;
};

export type ShowcaseAccessMode = "view_only" | "can_comment";

export type Showcase = {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  public_token: string;
  access_mode: ShowcaseAccessMode;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

export type ShowcaseProperty = {
  id: string;
  showcase_id: string;
  property_id: string;
  added_by: string | null;
  created_at: string;
};

export type PublicPropertyComment = {
  id: string;
  showcase_id: string;
  property_id: string;
  display_name: string;
  comment: string;
  created_at: string;
};

export type DealRoomPropertyComment = {
  id: string;
  deal_room_id: string;
  property_id: string;
  user_id: string;
  comment: string;
  created_at: string;
};
