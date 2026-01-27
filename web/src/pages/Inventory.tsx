import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { apiRequest } from '../lib/api'

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

interface Movement {
  id: string
  roomId: string
  itemId: string
  type: 'in' | 'out'
  reason: 'replenish' | 'eat' | 'waste' | 'expired' | 'purchase'
  amount: number
  note: string | null
  createdByUserId: string
  createdAt: string
}

export default function Inventory() {
  const { roomId } = useParams<{ roomId: string }>()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)

  // Add item form state
  const [showAddForm, setShowAddForm] = useState(false)
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
    try {
      const data = await apiRequest<{ items: InventoryItem[] }>(
        `rooms/${roomId}/inventory/items`
      )
      setItems(data.items)
    } catch (error) {
      console.error('Failed to load inventory:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault()

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

      await apiRequest(`rooms/${roomId}/inventory/items`, {
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
      setShowAddForm(false)

      // Reload items
      await loadData()
    } catch (error) {
      console.error('Failed to add item:', error)
      alert('Failed to add item')
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
  }

  async function handleAddMovement(e: React.FormEvent) {
    e.preventDefault()

    if (!movementAmount || parseInt(movementAmount, 10) <= 0) {
      alert('Please enter a valid amount')
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
    } catch (error: any) {
      console.error('Failed to add movement:', error)
      if (error.currentAmount !== undefined) {
        alert(`Insufficient stock. Current: ${error.currentAmount}, Requested: ${error.requested}`)
      } else {
        alert('Failed to add movement')
      }
    }
  }

  function getUnitDisplay(item: InventoryItem): string {
    if (item.trackingMode === 'servings') {
      return 'servings'
    }
    // For quantity, show base unit
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

  if (loading) {
    return <div className="p-4">Loading inventory...</div>
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Inventory</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {showAddForm ? 'Cancel' : 'Add Item'}
        </button>
      </div>

      {/* Add Item Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddItem}
          className="mb-6 p-4 border rounded bg-gray-50"
        >
          <h2 className="text-lg font-semibold mb-3">New Item</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                value={newItemCategory}
                onChange={(e) => setNewItemCategory(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="protein">Protein</option>
                <option value="carb">Carb</option>
                <option value="veg">Vegetable</option>
                <option value="snacks">Snacks</option>
                <option value="spices">Spices</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tracking Mode</label>
              <select
                value={newItemTrackingMode}
                onChange={(e) => setNewItemTrackingMode(e.target.value as 'quantity' | 'servings')}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="quantity">Quantity</option>
                <option value="servings">Servings</option>
              </select>
            </div>
            {newItemTrackingMode === 'quantity' && (
              <div>
                <label className="block text-sm font-medium mb-1">Unit</label>
                <select
                  value={newItemUnit}
                  onChange={(e) => setNewItemUnit(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="g">g (stored in grams)</option>
                  <option value="kg">kg (stored in grams)</option>
                  <option value="ml">ml (stored in ml)</option>
                  <option value="l">l (stored in ml)</option>
                  <option value="pcs">pcs (pieces)</option>
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">
                Initial Amount (base units)
              </label>
              <input
                type="number"
                value={newItemInitialAmount}
                onChange={(e) => setNewItemInitialAmount(e.target.value)}
                className="w-full px-3 py-2 border rounded"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Low Stock Threshold
              </label>
              <input
                type="number"
                value={newItemLowStockThreshold}
                onChange={(e) => setNewItemLowStockThreshold(e.target.value)}
                className="w-full px-3 py-2 border rounded"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Expiry Date
              </label>
              <input
                type="date"
                value={newItemExpiryDate}
                onChange={(e) => setNewItemExpiryDate(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
          </div>
          <button
            type="submit"
            className="mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Add Item
          </button>
        </form>
      )}

      {/* Items List */}
      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="text-gray-500">No items yet. Add your first item!</p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="p-4 border rounded bg-white shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{item.name}</h3>
                  <p className="text-sm text-gray-600">
                    Category: {item.category} | Mode: {item.trackingMode}
                  </p>
                  <p className="text-sm text-gray-600">
                    Current: {item.currentAmount} {getUnitDisplay(item)}
                  </p>
                  {isLowStock(item) && (
                    <p className="text-sm text-red-600 font-semibold">
                      ⚠️ Low Stock (threshold: {item.lowStockThreshold})
                    </p>
                  )}
                  {isExpiringSoon(item) && item.expiryDate && (
                    <p className="text-sm text-orange-600 font-semibold">
                      ⏰ Expires in {getDaysUntilExpiry(item.expiryDate)} days
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openMovementModal(item.id, item.name, 'in', 'replenish')}
                    className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                  >
                    Replenish
                  </button>
                  <button
                    onClick={() => openMovementModal(item.id, item.name, 'out', 'eat')}
                    className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                  >
                    Eat
                  </button>
                  <button
                    onClick={() => openMovementModal(item.id, item.name, 'out', 'waste')}
                    className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
                  >
                    Waste
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Movement Modal */}
      {showMovementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">
              {movementReason === 'replenish' ? 'Replenish' : movementReason === 'eat' ? 'Eat' : 'Waste'} - {movementItemName}
            </h2>
            <form onSubmit={handleAddMovement}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Amount (base units)
                </label>
                <input
                  type="number"
                  value={movementAmount}
                  onChange={(e) => setMovementAmount(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                  required
                  min="1"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Note (optional)
                </label>
                <input
                  type="text"
                  value={movementNote}
                  onChange={(e) => setMovementNote(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                  maxLength={300}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setShowMovementModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
