export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}

export const formatUsd = (amount: number) => formatMoney(amount, 'USD')

/** 1_250_000 -> "$1.3M": compact form for chart axes and KPI tiles. */
export function formatUsdCompact(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', notation: 'compact', minimumFractionDigits: 0, maximumFractionDigits: 1,
  }).format(amount)
}
