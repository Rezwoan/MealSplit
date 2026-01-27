export function parseAmountToCents(value: string | number) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('Invalid amount')
    }
    return Math.round(value * 100)
  }

  const normalized = value.trim()
  if (!/^[0-9]+(\.[0-9]{1,2})?$/.test(normalized)) {
    throw new Error('Invalid amount format')
  }

  const [whole, fraction = ''] = normalized.split('.')
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  return cents
}
