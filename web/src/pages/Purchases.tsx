import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { apiRequest } from '../lib/api'
import { formatCents } from '../lib/money'

interface PurchaseItem {
  id: string
  payerUserId: string
  payerDisplayName: string
  totalAmountCents: number
  currency: string
  notes: string | null
  category: string | null
  purchasedAt: string
}

interface Member {
  userId: string
  displayName: string
}

export default function Purchases() {
  const { roomId } = useParams()
  const [purchases, setPurchases] = useState<PurchaseItem[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [totalAmount, setTotalAmount] = useState('')
  const [payerUserId, setPayerUserId] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [notes, setNotes] = useState('')
  const [category, setCategory] = useState('')

  const loadData = async () => {
    if (!roomId) return
    setLoading(true)
    try {
      const [purchasesData, roomData] = await Promise.all([
        apiRequest<{ purchases: PurchaseItem[] }>(`/rooms/${roomId}/purchases`),
        apiRequest<{ members: Array<{ userId: string; displayName: string }> }>(`/rooms/${roomId}`),
      ])
      setPurchases(purchasesData.purchases)
      setMembers(roomData.members)
      if (roomData.members.length > 0 && !payerUserId) {
        setPayerUserId(roomData.members[0].userId)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load purchases')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [roomId])

  const currency = useMemo(() => purchases[0]?.currency ?? 'USD', [purchases])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!roomId) return
    setError(null)
    try {
      await apiRequest(`/rooms/${roomId}/purchases`, {
        method: 'POST',
        body: JSON.stringify({
          totalAmount,
          payerUserId,
          purchasedAt: purchaseDate ? new Date(purchaseDate).toISOString() : undefined,
          notes: notes || undefined,
          category: category || undefined,
        }),
      })
      setTotalAmount('')
      setNotes('')
      setCategory('')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create purchase')
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-neutral-900 p-6 shadow">
        <h1 className="text-2xl font-semibold text-white">Purchases</h1>
        {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
        {loading ? (
          <p className="mt-4 text-sm text-neutral-400">Loading purchases…</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {purchases.length === 0 ? (
              <li className="text-sm text-neutral-400">No purchases yet.</li>
            ) : (
              purchases.map((purchase) => (
                <li
                  key={purchase.id}
                  className="flex items-center justify-between rounded-lg border border-neutral-800 bg-black px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {purchase.payerDisplayName} ·{' '}
                      {formatCents(purchase.currency, purchase.totalAmountCents)}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {new Date(purchase.purchasedAt).toLocaleDateString()} {purchase.category}
                    </p>
                  </div>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      <div className="rounded-xl bg-neutral-900 p-6 shadow">
        <h2 className="text-lg font-semibold text-white">Add Purchase</h2>
        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <div>
            <label className="text-sm text-neutral-300" htmlFor="totalAmount">
              Total amount ({currency})
            </label>
            <input
              id="totalAmount"
              className="mt-1 w-full rounded-lg border border-neutral-800 bg-black px-3 py-2 text-sm text-white"
              value={totalAmount}
              onChange={(event) => setTotalAmount(event.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm text-neutral-300" htmlFor="payer">
              Payer
            </label>
            <select
              id="payer"
              className="mt-1 w-full rounded-lg border border-neutral-800 bg-black px-3 py-2 text-sm text-white"
              value={payerUserId}
              onChange={(event) => setPayerUserId(event.target.value)}
              required
            >
              {members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.displayName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-neutral-300" htmlFor="purchaseDate">
              Date
            </label>
            <input
              id="purchaseDate"
              type="date"
              className="mt-1 w-full rounded-lg border border-neutral-800 bg-black px-3 py-2 text-sm text-white"
              value={purchaseDate}
              onChange={(event) => setPurchaseDate(event.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-neutral-300" htmlFor="category">
              Category
            </label>
            <input
              id="category"
              className="mt-1 w-full rounded-lg border border-neutral-800 bg-black px-3 py-2 text-sm text-white"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-neutral-300" htmlFor="notes">
              Notes
            </label>
            <input
              id="notes"
              className="mt-1 w-full rounded-lg border border-neutral-800 bg-black px-3 py-2 text-sm text-white"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-300"
          >
            Save purchase
          </button>
        </form>
      </div>
    </div>
  )
}
