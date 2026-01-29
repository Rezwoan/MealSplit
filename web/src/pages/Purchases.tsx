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
import { PageHeader } from '../ui/PageHeader'

interface PurchaseItem {
  id: string
  payerUserId: string
  payerDisplayName: string
  totalAmountCents: number
  currency: string
  notes: string | null
  category: string | null
  splitMode?: string
  purchasedAt: string
}

interface Member {
  userId: string
  displayName: string
}

type SplitMode = 'equal' | 'custom_amount' | 'custom_percent'

interface SplitInput {
  userId: string
  value: string
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
  const [splitMode, setSplitMode] = useState<SplitMode>('equal')
  const [splitInputs, setSplitInputs] = useState<Record<string, string>>({})

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

  // Calculate active members for split validation
  const eligibleMembers = useMemo(() => members.filter(m => m.userId), [members])

  const splitValidation = useMemo(() => {
    if (splitMode === 'equal') return { isValid: true, message: '' }
    
    const total = parseFloat(totalAmount)
    if (isNaN(total) || total <= 0) return { isValid: false, message: 'Enter valid total amount' }

    const inputs = Object.entries(splitInputs)
    if (inputs.length !== eligibleMembers.length) {
      return { isValid: false, message: `Enter values for all ${eligibleMembers.length} members` }
    }

    if (splitMode === 'custom_amount') {
      const sum = inputs.reduce((acc, [_, val]) => {
        const num = parseFloat(val)
        return isNaN(num) ? acc : acc + num
      }, 0)
      const diff = Math.abs(sum - total)
      if (diff > 0.01) {
        return { 
          isValid: false, 
          message: `Split total: $${sum.toFixed(2)} (needs $${total.toFixed(2)})` 
        }
      }
      return { isValid: true, message: `Split total: $${sum.toFixed(2)} ✓` }
    }

    if (splitMode === 'custom_percent') {
      const sum = inputs.reduce((acc, [_, val]) => {
        const num = parseFloat(val)
        return isNaN(num) ? acc : acc + num
      }, 0)
      const diff = Math.abs(sum - 100)
      if (diff > 0.01) {
        return { 
          isValid: false, 
          message: `Split total: ${sum.toFixed(1)}% (needs 100%)` 
        }
      }
      return { isValid: true, message: `Split total: ${sum.toFixed(1)}% ✓` }
    }

    return { isValid: false, message: '' }
  }, [splitMode, totalAmount, splitInputs, eligibleMembers])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!roomId) return
    if (splitMode !== 'equal' && !splitValidation.isValid) {
      setError(splitValidation.message)
      return
    }
    setError(null)
    try {
      const body: any = {
        totalAmount,
        payerUserId,
        purchasedAt: purchaseDate ? new Date(purchaseDate).toISOString() : undefined,
        notes: notes || undefined,
        category: category || undefined,
      }

      if (splitMode !== 'equal') {
        body.splitMode = splitMode
        body.splitInputs = Object.entries(splitInputs).map(([userId, value]) => ({
          userId,
          value,
        }))
      }

      await apiRequest(`/rooms/${roomId}/purchases`, {
        method: 'POST',
        body: JSON.stringify(body),
      })
      setTotalAmount('')
      setNotes('')
      setCategory('')
      setPurchaseDate('')
      setSplitMode('equal')
      setSplitInputs({})
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create purchase')
    }
  }

  return (
    <AppShell>
      <AnimatedPage>
        <PageHeader
          title={roomName || 'Room'}
          description="Track shared purchases"
        />

        {roomId && <RoomTabs roomId={roomId} />}

        <div className="space-y-6 mt-6">

          {loading ? (
            <LoadingState message="Loading purchases..." />
          ) : (
            <>
              {/* Add Purchase Form */}
              <Card className="border-border/50 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Plus className="h-5 w-5 text-primary" />
                    Add Purchase
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form className="space-y-5" onSubmit={handleSubmit}>
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

                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Split Mode</label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={splitMode === 'equal' ? 'primary' : 'secondary'}
                          onClick={() => {
                            setSplitMode('equal')
                            setSplitInputs({})
                          }}
                          className="flex-1"
                        >
                          Equal
                        </Button>
                        <Button
                          type="button"
                          variant={splitMode === 'custom_amount' ? 'primary' : 'secondary'}
                          onClick={() => {
                            setSplitMode('custom_amount')
                            setSplitInputs({})
                          }}
                          className="flex-1"
                        >
                          Custom Amount
                        </Button>
                        <Button
                          type="button"
                          variant={splitMode === 'custom_percent' ? 'primary' : 'secondary'}
                          onClick={() => {
                            setSplitMode('custom_percent')
                            setSplitInputs({})
                          }}
                          className="flex-1"
                        >
                          Custom %
                        </Button>
                      </div>
                    </div>

                    {splitMode !== 'equal' && (
                      <div className="space-y-3 p-4 bg-muted/50 rounded-xl border border-border/50">
                        <p className="text-sm font-medium">
                          Enter {splitMode === 'custom_amount' ? 'amounts' : 'percentages'} for each member:
                        </p>
                        {eligibleMembers.map((member) => (
                          <Input
                            key={member.userId}
                            label={member.displayName}
                            type="number"
                            step={splitMode === 'custom_amount' ? '0.01' : '0.1'}
                            min="0"
                            value={splitInputs[member.userId] || ''}
                            onChange={(e) => {
                              setSplitInputs(prev => ({
                                ...prev,
                                [member.userId]: e.target.value
                              }))
                            }}
                            placeholder={splitMode === 'custom_amount' ? '0.00' : '0.0'}
                          />
                        ))}
                        <p className={`text-sm font-medium ${splitValidation.isValid ? 'text-success' : 'text-destructive'}`}>
                          {splitValidation.message}
                        </p>
                      </div>
                    )}

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
              <Card className="border-border/50 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <ShoppingCart className="h-5 w-5 text-primary" />
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
                          className="flex items-center justify-between p-4 rounded-xl border border-border/50 hover:bg-muted/30 hover:shadow-sm transition-all duration-200 cursor-pointer"
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
