interface SplitInput {
  totalCents: number
  memberIdsActiveForPurchase: string[]
  payerId: string
}

export function computeEqualSplitCents({
  totalCents,
  memberIdsActiveForPurchase,
}: SplitInput) {
  if (memberIdsActiveForPurchase.length === 0) {
    throw new Error('No active members to split')
  }

  const sorted = [...memberIdsActiveForPurchase].sort()
  const base = Math.floor(totalCents / sorted.length)
  const remainder = totalCents % sorted.length

  const result: Record<string, number> = {}
  sorted.forEach((userId, index) => {
    result[userId] = base + (index < remainder ? 1 : 0)
  })

  return result
}
