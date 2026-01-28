import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ShoppingCart, Plus, Paperclip } from 'lucide-react'
import { apiRequest, getReceipt } from '../lib/api'
import { formatCents } from '../lib/money'
import { AppShell } from '../layout/AppShell'
import { AnimatedPage } from '../ui/AnimatedPage'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { LoadingState } from '../ui/LoadingSpinner'
import { EmptyState } from '../ui/EmptyState'
import { RoomTabs } from '../components/RoomTabs'
import { PurchaseDetailsModal } from '../components/PurchaseDetailsModal'

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
  const [roomName, setRoomName] = useState('')
  const [receipts, setReceipts] = useState<Record<string, boolean>>({})
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseItem | null>(null)

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
        apiRequest<{ room: { name: string }; members: Array<{ userId: string; displayName: string }> }>(`/rooms/${roomId}`),
      ])
      setPurchases(purchasesData.purchases)
      setMembers(roomData.members)
      setRoomName(roomData.room.name)
      if (roomData.members.length > 0 && !payerUserId) {
        setPayerUserId(roomData.members[0].userId)
      }

      // Check for receipts
      const receiptStatus: Record<string, boolean> = {}
      await Promise.all(
        purchasesData.purchases.map(async (purchase) => {
          try {
            await getReceipt(roomId, purchase.id)
            receiptStatus[purchase.id] = true
          } catch {
            receiptStatus[purchase.id] = false
          }
        })
      )
      setReceipts(receiptStatus)
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
      setPurchaseDate('')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create purchase')
    }
  }

  return (
    <AppShell>
      <AnimatedPage>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{roomName || 'Room'}</h1>
            <p className="text-sm text-muted-foreground mt-1">Track shared purchases</p>
          </div>

          {roomId && <RoomTabs roomId={roomId} />}

          {loading ? (
            <LoadingState message="Loading purchases..." />
          ) : (
            <>
              {/* Add Purchase Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Add Purchase
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4" onSubmit={handleSubmit}>
                    <Input
                      label={`Total amount (${currency})`}
                      type="number"
                      step="0.01"
                      value={totalAmount}
                      onChange={(e) => setTotalAmount(e.target.value)}
                      placeholder="25.00"
                      required
                    />

                    <Select
                      label="Payer"
                      value={payerUserId}
                      onChange={(e) => setPayerUserId(e.target.value)}
                      required
                    >
                      {members.map((member) => (
                        <option key={member.userId} value={member.userId}>
                          {member.displayName}
                        </option>
                      ))}
                    </Select>

                    <Input
                      label="Date"
                      type="date"
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                    />

                    <Input
                      label="Category (optional)"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="Groceries, Utilities, etc."
                    />

                    <Input
                      label="Notes (optional)"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Additional details"
                    />

                    {error && (
                      <p className="text-sm text-destructive">{error}</p>
                    )}

                    <Button type="submit" variant="primary" className="w-full">
                      Save Purchase
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Purchases List */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Purchase History ({purchases.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {purchases.length === 0 ? (
                    <EmptyState
                      icon={ShoppingCart}
                      title="No purchases yet"
                      description="Add your first purchase to start tracking shared expenses."
                    />
                  ) : (
                    <ul className="space-y-3">
                      {purchases.map((purchase) => (
                        <li
                          key={purchase.id}
                          className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-card-hover transition-colors cursor-pointer"
                          onClick={() => setSelectedPurchase(purchase)}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{purchase.payerDisplayName}</p>
                              <span className="text-primary font-semibold">
                                {formatCents(purchase.currency, purchase.totalAmountCents)}
                              </span>
                              {receipts[purchase.id] && (
                                <Paperclip className="w-4 h-4 text-blue-500" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                              <span>{new Date(purchase.purchasedAt).toLocaleDateString()}</span>
                              {purchase.category && (
                                <>
                                  <span>·</span>
                                  <span>{purchase.category}</span>
                                </>
                              )}
                            </div>
                            {purchase.notes && (
                              <p className="text-sm text-muted-foreground mt-1">{purchase.notes}</p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Purchase Details Modal */}
        {selectedPurchase && roomId && (
          <PurchaseDetailsModal
            isOpen={!!selectedPurchase}
            onClose={() => {
              setSelectedPurchase(null)
              loadData() // Reload to update receipt indicators
            }}
            purchase={{
              id: selectedPurchase.id,
              amount: selectedPurchase.totalAmountCents / 100,
              currency: selectedPurchase.currency,
              description: selectedPurchase.notes || '',
              category: selectedPurchase.category,
              paidBy: {
                id: selectedPurchase.payerUserId,
                name: selectedPurchase.payerDisplayName,
                email: '',
              },
              date: selectedPurchase.purchasedAt,
              createdAt: selectedPurchase.purchasedAt,
            }}
            roomId={roomId}
          />
        )}
      </AnimatedPage>
    </AppShell>
  )
}
