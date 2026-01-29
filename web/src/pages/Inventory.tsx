import type { FormEvent } from 'react'
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Package, Plus, AlertTriangle, Clock, TrendingUp, TrendingDown } from 'lucide-react'
import { apiRequest } from '../lib/api'
import { AppShell } from '../layout/AppShell'
import { AnimatedPage } from '../ui/AnimatedPage'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Badge } from '../ui/Badge'
import { LoadingState } from '../ui/LoadingSpinner'
import { EmptyState } from '../ui/EmptyState'
import { Modal } from '../ui/Modal'
import { RoomTabs } from '../components/RoomTabs'
import { PageHeader } from '../ui/PageHeader'

interface InventoryItem {
  id: string
  roomId: string
  name: string
  category: string
  trackingMode: 'quantity' | 'servings'
  unit: string | null
  lowStockThreshold: number | null
  expiryDate: string | null
  createdByUserId: string
  createdAt: string
  updatedAt: string
  currentAmount: number
}

export default function Inventory() {
  const { roomId } = useParams<{ roomId: string }>()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [roomName, setRoomName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Add item modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemCategory, setNewItemCategory] = useState('protein')
  const [newItemTrackingMode, setNewItemTrackingMode] = useState<'quantity' | 'servings'>('quantity')
  const [newItemUnit, setNewItemUnit] = useState('g')
  const [newItemInitialAmount, setNewItemInitialAmount] = useState('')
  const [newItemLowStockThreshold, setNewItemLowStockThreshold] = useState('')
  const [newItemExpiryDate, setNewItemExpiryDate] = useState('')

  // Movement modal state
  const [showMovementModal, setShowMovementModal] = useState(false)
  const [movementItemId, setMovementItemId] = useState('')
  const [movementItemName, setMovementItemName] = useState('')
  const [movementType, setMovementType] = useState<'in' | 'out'>('in')
  const [movementReason, setMovementReason] = useState<'replenish' | 'eat' | 'waste' | 'expired'>('replenish')
  const [movementAmount, setMovementAmount] = useState('')
  const [movementNote, setMovementNote] = useState('')

  useEffect(() => {
    loadData()
  }, [roomId])

  async function loadData() {
    if (!roomId) return
    setLoading(true)
    try {
      const [itemsData, roomData] = await Promise.all([
        apiRequest<{ items: InventoryItem[] }>(`/rooms/${roomId}/inventory/items`),
        apiRequest<{ room: { name: string } }>(`/rooms/${roomId}`),
      ])
      setItems(itemsData.items)
      setRoomName(roomData.room.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddItem(e: FormEvent) {
    e.preventDefault()
    setError(null)

    try {
      const body: any = {
        name: newItemName,
        category: newItemCategory,
        trackingMode: newItemTrackingMode,
      }

      if (newItemTrackingMode === 'quantity') {
        body.unit = newItemUnit
      }

      if (newItemInitialAmount) {
        body.initialAmount = parseInt(newItemInitialAmount, 10)
      }

      if (newItemLowStockThreshold) {
        body.lowStockThreshold = parseInt(newItemLowStockThreshold, 10)
      }

      if (newItemExpiryDate) {
        body.expiryDate = newItemExpiryDate
      }

      await apiRequest(`/rooms/${roomId}/inventory/items`, {
        method: 'POST',
        body: JSON.stringify(body),
      })

      // Reset form
      setNewItemName('')
      setNewItemCategory('protein')
      setNewItemTrackingMode('quantity')
      setNewItemUnit('g')
      setNewItemInitialAmount('')
      setNewItemLowStockThreshold('')
      setNewItemExpiryDate('')
      setShowAddModal(false)

      // Reload items
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item')
    }
  }

  function openMovementModal(
    itemId: string,
    itemName: string,
    type: 'in' | 'out',
    reason: 'replenish' | 'eat' | 'waste'
  ) {
    setMovementItemId(itemId)
    setMovementItemName(itemName)
    setMovementType(type)
    setMovementReason(reason)
    setMovementAmount('')
    setMovementNote('')
    setShowMovementModal(true)
    setError(null)
  }

  async function handleAddMovement(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!movementAmount || parseInt(movementAmount, 10) <= 0) {
      setError('Please enter a valid amount')
      return
    }

    try {
      await apiRequest(`rooms/${roomId}/inventory/movements`, {
        method: 'POST',
        body: JSON.stringify({
          itemId: movementItemId,
          type: movementType,
          reason: movementReason,
          amount: parseInt(movementAmount, 10),
          note: movementNote || undefined,
        }),
      })

      setShowMovementModal(false)
      await loadData()
    } catch (err: any) {
      if (err.currentAmount !== undefined) {
        setError(`Insufficient stock. Current: ${err.currentAmount}, Requested: ${err.requested}`)
      } else {
        setError(err instanceof Error ? err.message : 'Failed to add movement')
      }
    }
  }

  function getUnitDisplay(item: InventoryItem): string {
    if (item.trackingMode === 'servings') {
      return 'servings'
    }
    const unitMap: Record<string, string> = {
      kg: 'g',
      l: 'ml',
      g: 'g',
      ml: 'ml',
      pcs: 'pcs',
    }
    return unitMap[item.unit || 'units'] || item.unit || 'units'
  }

  function isLowStock(item: InventoryItem): boolean {
    return (
      item.lowStockThreshold !== null &&
      item.currentAmount <= item.lowStockThreshold
    )
  }

  function isExpiringSoon(item: InventoryItem): boolean {
    if (!item.expiryDate) return false
    const expiryDateObj = new Date(item.expiryDate)
    const today = new Date()
    const sevenDaysFromNow = new Date(today)
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
    return expiryDateObj <= sevenDaysFromNow && expiryDateObj >= today
  }

  function getDaysUntilExpiry(expiryDate: string): number {
    const expiryDateObj = new Date(expiryDate)
    const today = new Date()
    return Math.ceil(
      (expiryDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )
  }

  return (
    <AppShell>
      <AnimatedPage>
        <PageHeader
          title={roomName || 'Room'}
          description="Track shared inventory and food items"
          actions={
            <Button variant="primary" onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4" />
              Add Item
            </Button>
          }
        />

        {/* Room Tabs */}
        {roomId && <RoomTabs roomId={roomId} />}

        <div className="space-y-6 mt-6">
          {error && (
            <div className="flex items-start gap-3 rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <LoadingState message="Loading inventory..." />
          ) : (
            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Package className="h-5 w-5 text-primary" />
                  Inventory Items ({items.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <EmptyState
                    icon={Package}
                    title="No items yet"
                    description="Add your first inventory item to start tracking food and supplies."
                  />
                ) : (
                  <ul className="space-y-3">
                    {items.map((item) => (
                      <li
                        key={item.id}
                        className="flex flex-col gap-3 p-4 rounded-xl border border-border/50 hover:bg-muted/30 hover:shadow-sm transition-all duration-200 lg:flex-row lg:items-center lg:justify-between"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium">{item.name}</p>
                            <Badge variant="default">{item.category}</Badge>
                            {isLowStock(item) && (
                              <Badge variant="destructive">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Low Stock
                              </Badge>
                            )}
                            {isExpiringSoon(item) && item.expiryDate && (
                              <Badge variant="warning">
                                <Clock className="h-3 w-3 mr-1" />
                                Expires in {getDaysUntilExpiry(item.expiryDate)}d
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                            <span>Mode: {item.trackingMode}</span>
                            <span>·</span>
                            <span>
                              Current: {item.currentAmount} {getUnitDisplay(item)}
                            </span>
                            {item.lowStockThreshold !== null && (
                              <>
                                <span>·</span>
                                <span>Threshold: {item.lowStockThreshold}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => openMovementModal(item.id, item.name, 'in', 'replenish')}
                          >
                            <TrendingUp className="h-3.5 w-3.5 mr-1" />
                            Replenish
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => openMovementModal(item.id, item.name, 'out', 'eat')}
                          >
                            <TrendingDown className="h-3.5 w-3.5 mr-1" />
                            Eat
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openMovementModal(item.id, item.name, 'out', 'waste')}
                          >
                            Waste
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Add Item Modal */}
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Add Inventory Item"
        >
          <form className="space-y-4" onSubmit={handleAddItem}>
            <Input
              label="Name"
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Chicken breast, Rice, etc."
              required
            />

            <Select
              label="Category"
              value={newItemCategory}
              onChange={(e) => setNewItemCategory(e.target.value)}
            >
              <option value="protein">Protein</option>
              <option value="carb">Carb</option>
              <option value="veg">Vegetable</option>
              <option value="snacks">Snacks</option>
              <option value="spices">Spices</option>
              <option value="other">Other</option>
            </Select>

            <Select
              label="Tracking Mode"
              value={newItemTrackingMode}
              onChange={(e) => setNewItemTrackingMode(e.target.value as 'quantity' | 'servings')}
            >
              <option value="quantity">Quantity</option>
              <option value="servings">Servings</option>
            </Select>

            {newItemTrackingMode === 'quantity' && (
              <Select
                label="Unit"
                value={newItemUnit}
                onChange={(e) => setNewItemUnit(e.target.value)}
              >
                <option value="g">g (stored in grams)</option>
                <option value="kg">kg (stored in grams)</option>
                <option value="ml">ml (stored in ml)</option>
                <option value="l">l (stored in ml)</option>
                <option value="pcs">pcs (pieces)</option>
              </Select>
            )}

            <Input
              label="Initial Amount (base units)"
              type="number"
              value={newItemInitialAmount}
              onChange={(e) => setNewItemInitialAmount(e.target.value)}
              placeholder="Optional"
            />

            <Input
              label="Low Stock Threshold"
              type="number"
              value={newItemLowStockThreshold}
              onChange={(e) => setNewItemLowStockThreshold(e.target.value)}
              placeholder="Optional"
            />

            <Input
              label="Expiry Date"
              type="date"
              value={newItemExpiryDate}
              onChange={(e) => setNewItemExpiryDate(e.target.value)}
            />

            <Button type="submit" variant="primary" className="w-full">
              Add Item
            </Button>
          </form>
        </Modal>

        {/* Movement Modal */}
        <Modal
          isOpen={showMovementModal}
          onClose={() => setShowMovementModal(false)}
          title={`${movementReason === 'replenish' ? 'Replenish' : movementReason === 'eat' ? 'Eat' : 'Waste'} - ${movementItemName}`}
        >
          <form className="space-y-4" onSubmit={handleAddMovement}>
            <Input
              label="Amount (base units)"
              type="number"
              value={movementAmount}
              onChange={(e) => setMovementAmount(e.target.value)}
              min="1"
              required
            />

            <Input
              label="Note (optional)"
              type="text"
              value={movementNote}
              onChange={(e) => setMovementNote(e.target.value)}
              maxLength={300}
              placeholder="Additional details"
            />

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" variant="primary" className="flex-1">
                Confirm
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setShowMovementModal(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Modal>
      </AnimatedPage>
    </AppShell>
  )
}
