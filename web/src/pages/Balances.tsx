import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { apiRequest } from '../lib/api'
import { formatCents } from '../lib/money'

interface BalanceMember {
  userId: string
  displayName: string
  paidCents: number
  shareCents: number
  netCents: number
}

interface Transfer {
  fromUserId: string
  toUserId: string
  amountCents: number
}

export default function Balances() {
  const { roomId } = useParams()
  const [members, setMembers] = useState<BalanceMember[]>([])
  const [memberMap, setMemberMap] = useState<Record<string, string>>({})
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [currency, setCurrency] = useState('USD')
  const [error, setError] = useState<string | null>(null)

  const loadBalances = async () => {
    if (!roomId) return
    try {
      const data = await apiRequest<{
        currency: string
        members: BalanceMember[]
        suggestedTransfers: Transfer[]
      }>(`/rooms/${roomId}/balances`)
      setCurrency(data.currency)
      setMembers(data.members)
      setTransfers(data.suggestedTransfers)
      const map: Record<string, string> = {}
      data.members.forEach((member) => {
        map[member.userId] = member.displayName
      })
      setMemberMap(map)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load balances')
    }
  }

  useEffect(() => {
    loadBalances()
  }, [roomId])

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-neutral-900 p-6 shadow">
        <h1 className="text-2xl font-semibold text-white">Balances</h1>
        {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
        <ul className="mt-4 space-y-3">
          {members.map((member) => (
            <li
              key={member.userId}
              className="flex items-center justify-between rounded-lg border border-neutral-800 bg-black px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-white">{member.displayName}</p>
                <p className="text-xs text-neutral-500">
                  Paid {formatCents(currency, member.paidCents)} · Share{' '}
                  {formatCents(currency, member.shareCents)}
                </p>
              </div>
              <p className="text-sm font-semibold text-emerald-300">
                {formatCents(currency, member.netCents)}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl bg-neutral-900 p-6 shadow">
        <h2 className="text-lg font-semibold text-white">Suggested transfers</h2>
        <ul className="mt-4 space-y-2">
          {transfers.length === 0 ? (
            <li className="text-sm text-neutral-400">No transfers needed.</li>
          ) : (
            transfers.map((transfer) => (
              <li key={`${transfer.fromUserId}-${transfer.toUserId}`} className="text-sm text-neutral-200">
                {memberMap[transfer.fromUserId] ?? transfer.fromUserId} pays{' '}
                {memberMap[transfer.toUserId] ?? transfer.toUserId} {formatCents(currency, transfer.amountCents)}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  )
}
