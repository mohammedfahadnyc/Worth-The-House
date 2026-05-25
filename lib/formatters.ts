export function formatCurrency(value: number | null | undefined) {
  const amount = Number.isFinite(Number(value)) ? Number(value) : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Math.abs(amount) % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export function formatPercent(value: number | null | undefined, digits = 1) {
  const amount = Number.isFinite(Number(value)) ? Number(value) : 0;
  return `${amount.toFixed(digits)}%`;
}

export function formatNumber(value: number | null | undefined) {
  const amount = Number.isFinite(Number(value)) ? Number(value) : 0;
  return new Intl.NumberFormat("en-US").format(amount);
}
