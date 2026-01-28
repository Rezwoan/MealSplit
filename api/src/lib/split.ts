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

export function computeCustomAmountSplit({
  totalCents,
  memberIdsActiveForPurchase,
  customAmounts,
}: {
  totalCents: number
  memberIdsActiveForPurchase: string[]
  customAmounts: Record<string, number>
}): Record<string, number> {
  // Validate all members have inputs
  const missingMembers = memberIdsActiveForPurchase.filter(id => !customAmounts[id] && customAmounts[id] !== 0)
  if (missingMembers.length > 0) {
    throw new Error(`Missing custom amounts for members: ${missingMembers.join(', ')}`)
  }

  // Validate no extra users
  const extraUsers = Object.keys(customAmounts).filter(id => !memberIdsActiveForPurchase.includes(id))
  if (extraUsers.length > 0) {
    throw new Error(`Custom amounts include ineligible members: ${extraUsers.join(', ')}`)
  }

  // Calculate sum
  const sum = Object.values(customAmounts).reduce((acc, val) => acc + val, 0)
  if (sum !== totalCents) {
    throw new Error(`Custom amounts sum (${sum} cents) does not equal total (${totalCents} cents)`)
  }

  return customAmounts
}

export function computeCustomPercentSplit({
  totalCents,
  memberIdsActiveForPurchase,
  customPercents,
}: {
  totalCents: number
  memberIdsActiveForPurchase: string[]
  customPercents: Record<string, number> // basis points (2500 = 25%)
}): Record<string, number> {
  // Validate all members have inputs
  const missingMembers = memberIdsActiveForPurchase.filter(id => !customPercents[id] && customPercents[id] !== 0)
  if (missingMembers.length > 0) {
    throw new Error(`Missing custom percentages for members: ${missingMembers.join(', ')}`)
  }

  // Validate no extra users
  const extraUsers = Object.keys(customPercents).filter(id => !memberIdsActiveForPurchase.includes(id))
  if (extraUsers.length > 0) {
    throw new Error(`Custom percentages include ineligible members: ${extraUsers.join(', ')}`)
  }

  // Validate sum equals 100% (10000 basis points)
  const sum = Object.values(customPercents).reduce((acc, val) => acc + val, 0)
  if (sum !== 10000) {
    throw new Error(`Custom percentages sum (${sum / 100}%) must equal 100%`)
  }

  // Compute raw shares and distribute remainder
  const sorted = [...memberIdsActiveForPurchase].sort()
  const raw: Record<string, number> = {}
  let allocated = 0

  sorted.forEach(userId => {
    const share = Math.floor((totalCents * customPercents[userId]) / 10000)
    raw[userId] = share
    allocated += share
  })

  // Distribute remainder cents in stable order
  const remainder = totalCents - allocated
  for (let i = 0; i < remainder; i++) {
    raw[sorted[i]]++
  }

  return raw
}

