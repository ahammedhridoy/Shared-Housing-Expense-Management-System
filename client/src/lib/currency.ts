export const CURRENCY_CODE = import.meta.env.VITE_CURRENCY_CODE || "BDT"
export const CURRENCY_SYMBOL = import.meta.env.VITE_CURRENCY_SYMBOL || "৳"
export const CURRENCY_LOCALE = import.meta.env.VITE_CURRENCY_LOCALE || "en-BD"

// ৳1,250 (whole taka; paisa are rounded for display)
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(CURRENCY_LOCALE, {
    style: "currency",
    currencyDisplay: "narrowSymbol",
    currency: CURRENCY_CODE,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// ৳42.37 — for the meal rate, where paisa matter
export function formatRate(amount: number): string {
  return new Intl.NumberFormat(CURRENCY_LOCALE, {
    style: "currency",
    currencyDisplay: "narrowSymbol",
    currency: CURRENCY_CODE,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "")
}
