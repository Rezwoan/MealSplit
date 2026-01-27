/**
 * Unit conversion utilities for inventory tracking.
 * 
 * For MVP: accept amounts directly as base unit integers.
 * Future enhancement: support conversions (kg->g, l->ml, etc.)
 */

/**
 * Normalize amount to base unit integer.
 * 
 * For MVP, we assume the client sends amounts already in base units:
 * - For quantity mode with unit='kg': amount is in grams
 * - For quantity mode with unit='l': amount is in ml
 * - For quantity mode with unit='g' or 'pcs': amount is in that unit
 * - For servings mode: amount is number of servings
 * 
 * Future: add inputUnit parameter for conversions.
 */
export function normalizeAmount(params: {
  trackingMode: 'quantity' | 'servings'
  unit?: string | null
  inputAmount: number
  inputUnit?: string | null
}): number {
  const { inputAmount } = params
  
  // Validate positive integer
  if (!Number.isInteger(inputAmount) || inputAmount <= 0) {
    throw new Error('Amount must be a positive integer')
  }
  
  // For MVP, return as-is (client responsible for base unit)
  return inputAmount
}

/**
 * Get base unit display name for an item.
 */
export function getBaseUnitDisplay(params: {
  trackingMode: 'quantity' | 'servings'
  unit?: string | null
}): string {
  const { trackingMode, unit } = params
  
  if (trackingMode === 'servings') {
    return 'servings'
  }
  
  // For quantity mode, show the base unit
  if (!unit) {
    return 'units'
  }
  
  // Map display units to base units
  const baseUnitMap: Record<string, string> = {
    kg: 'g',
    l: 'ml',
    g: 'g',
    ml: 'ml',
    pcs: 'pcs',
  }
  
  return baseUnitMap[unit] || unit
}
