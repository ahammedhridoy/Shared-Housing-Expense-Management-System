export const CURRENCY_CODE = import.meta.env.VITE_CURRENCY_CODE || "BDT"
export const CURRENCY_SYMBOL = import.meta.env.VITE_CURRENCY_SYMBOL || "৳"
export const CURRENCY_LOCALE = import.meta.env.VITE_CURRENCY_LOCALE || "en-BD"

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(CURRENCY_LOCALE, {
    style: "currency",
    currency: CURRENCY_CODE,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
