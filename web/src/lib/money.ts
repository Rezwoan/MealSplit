export function formatCents(currency: string, cents: number) {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  })
  return formatter.format(cents / 100)
}
