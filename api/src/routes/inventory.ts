import { randomUUID } from 'crypto'
import { FastifyInstance } from 'fastify'
import { and, eq, sql, sum, desc } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db'
import {
  inventoryItems,
  inventoryMovements,
  roomMemberships,
} from '../db/schema'
import { requireRoomMember } from '../lib/room-guards'

/**
 * Inventory routes:
 * - POST /rooms/:roomId/inventory/items
 * - GET /rooms/:roomId/inventory/items
 * - PATCH /rooms/:roomId/inventory/items/:itemId
 * - POST /rooms/:roomId/inventory/movements
 * - GET /rooms/:roomId/inventory/alerts
 */
export async function inventoryRoutes(app: FastifyInstance) {
  // ============================================================================
  // POST /rooms/:roomId/inventory/items
  // Create a new inventory item, optionally with initial stock
  // ============================================================================
  app.post<{
    Params: { roomId: string }
    Body: {
      name: string
      category: string
      trackingMode: 'quantity' | 'servings'
      unit?: string
      initialAmount?: number
      lowStockThreshold?: number
      expiryDate?: string | null
    }
  }>(
    '/rooms/:roomId/inventory/items',
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      const { roomId } = request.params
      const userId = request.user.sub

      await requireRoomMember(roomId, userId)

      const bodySchema = z.object({
        name: z.string().min(1).max(120),
        category: z.string().min(1).max(30),
        trackingMode: z.enum(['quantity', 'servings']),
        unit: z.string().max(20).optional(),
        initialAmount: z.number().int().positive().optional(),
        lowStockThreshold: z.number().int().nonnegative().optional(),
        expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      })

      const parsed = bodySchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.message })
      }

      const {
        name,
        category,
        trackingMode,
        unit,
        initialAmount,
        lowStockThreshold,
        expiryDate,
      } = parsed.data

      // Validate: quantity mode requires unit
      if (trackingMode === 'quantity' && !unit) {
        return reply
          .code(400)
          .send({ error: 'Unit is required for quantity tracking mode' })
      }

      const itemId = randomUUID()

      // Insert item
      await db.insert(inventoryItems).values({
        id: itemId,
        roomId,
        name,
        category,
        trackingMode,
        unit: unit || null,
        lowStockThreshold: lowStockThreshold || null,
        expiryDate: expiryDate || null,
        createdByUserId: userId,
      })

      // If initialAmount provided, create IN movement
      if (initialAmount && initialAmount > 0) {
        await db.insert(inventoryMovements).values({
          id: randomUUID(),
          roomId,
          itemId,
          type: 'in',
          reason: 'replenish',
          amount: initialAmount,
          note: 'Initial stock',
          createdByUserId: userId,
        })
      }

      const [item] = await db
        .select()
        .from(inventoryItems)
        .where(eq(inventoryItems.id, itemId))

      return reply.send({ item })
    }
  )

  // ============================================================================
  // GET /rooms/:roomId/inventory/items
  // List all inventory items with computed currentAmount
  // ============================================================================
  app.get<{
    Params: { roomId: string }
  }>(
    '/rooms/:roomId/inventory/items',
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      const { roomId } = request.params
      const userId = request.user.sub

      await requireRoomMember(roomId, userId)

      // Fetch all items in room
      const items = await db
        .select()
        .from(inventoryItems)
        .where(eq(inventoryItems.roomId, roomId))
        .orderBy(inventoryItems.name)

      // Compute currentAmount for each item
      const itemsWithAmount = await Promise.all(
        items.map(async (item) => {
          const [inResult] = await db
            .select({ total: sum(inventoryMovements.amount) })
            .from(inventoryMovements)
            .where(
              and(
                eq(inventoryMovements.itemId, item.id),
                eq(inventoryMovements.type, 'in')
              )
            )

          const [outResult] = await db
            .select({ total: sum(inventoryMovements.amount) })
            .from(inventoryMovements)
            .where(
              and(
                eq(inventoryMovements.itemId, item.id),
                eq(inventoryMovements.type, 'out')
              )
            )

          const totalIn = Number(inResult?.total || 0)
          const totalOut = Number(outResult?.total || 0)
          const currentAmount = totalIn - totalOut

          return {
            ...item,
            currentAmount,
          }
        })
      )

      return reply.send({ items: itemsWithAmount })
    }
  )

  // ============================================================================
  // PATCH /rooms/:roomId/inventory/items/:itemId
  // Update item metadata (name, category, lowStockThreshold, expiryDate)
  // ============================================================================
  app.patch<{
    Params: { roomId: string; itemId: string }
    Body: {
      name?: string
      category?: string
      lowStockThreshold?: number | null
      expiryDate?: string | null
    }
  }>(
    '/rooms/:roomId/inventory/items/:itemId',
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      const { roomId, itemId } = request.params
      const userId = request.user.sub

      await requireRoomMember(roomId, userId)

      const bodySchema = z.object({
        name: z.string().min(1).max(120).optional(),
        category: z.string().min(1).max(30).optional(),
        lowStockThreshold: z.number().int().nonnegative().nullable().optional(),
        expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      })

      const parsed = bodySchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.message })
      }

      const updateData = parsed.data

      // Verify item exists and belongs to room
      const [item] = await db
        .select()
        .from(inventoryItems)
        .where(
          and(eq(inventoryItems.id, itemId), eq(inventoryItems.roomId, roomId))
        )

      if (!item) {
        return reply.code(404).send({ error: 'Item not found' })
      }

      // Update item
      await db
        .update(inventoryItems)
        .set(updateData)
        .where(eq(inventoryItems.id, itemId))

      const [updatedItem] = await db
        .select()
        .from(inventoryItems)
        .where(eq(inventoryItems.id, itemId))

      return reply.send({ item: updatedItem })
    }
  )

  // ============================================================================
  // POST /rooms/:roomId/inventory/movements
  // Add a movement (replenish/eat/waste/etc.)
  // ============================================================================
  app.post<{
    Params: { roomId: string }
    Body: {
      itemId: string
      type: 'in' | 'out'
      reason: 'replenish' | 'eat' | 'waste' | 'expired' | 'purchase'
      amount: number
      note?: string
    }
  }>(
    '/rooms/:roomId/inventory/movements',
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      const { roomId } = request.params
      const userId = request.user.sub

      await requireRoomMember(roomId, userId)

      const bodySchema = z.object({
        itemId: z.string().uuid(),
        type: z.enum(['in', 'out']),
        reason: z.enum(['replenish', 'eat', 'waste', 'expired', 'purchase']),
        amount: z.number().int().positive(),
        note: z.string().max(300).optional(),
      })

      const parsed = bodySchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.message })
      }

      const { itemId, type, reason, amount, note } = parsed.data

      // Verify item exists and belongs to room
      const [item] = await db
        .select()
        .from(inventoryItems)
        .where(
          and(eq(inventoryItems.id, itemId), eq(inventoryItems.roomId, roomId))
        )

      if (!item) {
        return reply.code(404).send({ error: 'Item not found' })
      }

      // If type='out', check we have enough stock
      if (type === 'out') {
        const [inResult] = await db
          .select({ total: sum(inventoryMovements.amount) })
          .from(inventoryMovements)
          .where(
            and(
              eq(inventoryMovements.itemId, itemId),
              eq(inventoryMovements.type, 'in')
            )
          )

        const [outResult] = await db
          .select({ total: sum(inventoryMovements.amount) })
          .from(inventoryMovements)
          .where(
            and(
              eq(inventoryMovements.itemId, itemId),
              eq(inventoryMovements.type, 'out')
            )
          )

        const totalIn = Number(inResult?.total || 0)
        const totalOut = Number(outResult?.total || 0)
        const currentAmount = totalIn - totalOut

        if (currentAmount < amount) {
          return reply.code(400).send({
            error: 'Insufficient stock',
            currentAmount,
            requested: amount,
          })
        }
      }

      // Insert movement
      const movementId = randomUUID()
      await db.insert(inventoryMovements).values({
        id: movementId,
        roomId,
        itemId,
        type,
        reason,
        amount,
        note: note || null,
        createdByUserId: userId,
      })

      // Compute new currentAmount
      const [inResult] = await db
        .select({ total: sum(inventoryMovements.amount) })
        .from(inventoryMovements)
        .where(
          and(
            eq(inventoryMovements.itemId, itemId),
            eq(inventoryMovements.type, 'in')
          )
        )

      const [outResult] = await db
        .select({ total: sum(inventoryMovements.amount) })
        .from(inventoryMovements)
        .where(
          and(
            eq(inventoryMovements.itemId, itemId),
            eq(inventoryMovements.type, 'out')
          )
        )

      const totalIn = Number(inResult?.total || 0)
      const totalOut = Number(outResult?.total || 0)
      const newCurrentAmount = totalIn - totalOut

      const [movement] = await db
        .select()
        .from(inventoryMovements)
        .where(eq(inventoryMovements.id, movementId))

      return reply.send({ movement, newCurrentAmount })
    }
  )

  // ============================================================================
  // GET /rooms/:roomId/inventory/alerts
  // Get low stock and expiring soon items
  // ============================================================================
  app.get<{
    Params: { roomId: string }
  }>(
    '/rooms/:roomId/inventory/alerts',
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      const { roomId } = request.params
      const userId = request.user.sub

      await requireRoomMember(roomId, userId)

      // Fetch all items in room
      const items = await db
        .select()
        .from(inventoryItems)
        .where(eq(inventoryItems.roomId, roomId))

      // Compute currentAmount and check thresholds
      const lowStock: Array<{
        itemId: string
        name: string
        currentAmount: number
        threshold: number
      }> = []

      const expiringSoon: Array<{
        itemId: string
        name: string
        expiryDate: string
        daysLeft: number
      }> = []

      const today = new Date()
      const sevenDaysFromNow = new Date(today)
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

      for (const item of items) {
        // Compute currentAmount
        const [inResult] = await db
          .select({ total: sum(inventoryMovements.amount) })
          .from(inventoryMovements)
          .where(
            and(
              eq(inventoryMovements.itemId, item.id),
              eq(inventoryMovements.type, 'in')
            )
          )

        const [outResult] = await db
          .select({ total: sum(inventoryMovements.amount) })
          .from(inventoryMovements)
          .where(
            and(
              eq(inventoryMovements.itemId, item.id),
              eq(inventoryMovements.type, 'out')
            )
          )

        const totalIn = Number(inResult?.total || 0)
        const totalOut = Number(outResult?.total || 0)
        const currentAmount = totalIn - totalOut

        // Check low stock
        if (
          item.lowStockThreshold !== null &&
          currentAmount <= item.lowStockThreshold
        ) {
          lowStock.push({
            itemId: item.id,
            name: item.name,
            currentAmount,
            threshold: item.lowStockThreshold,
          })
        }

        // Check expiring soon (within 7 days)
        if (item.expiryDate) {
          const expiryDateObj = new Date(item.expiryDate)
          if (expiryDateObj <= sevenDaysFromNow && expiryDateObj >= today) {
            const daysLeft = Math.ceil(
              (expiryDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
            )
            expiringSoon.push({
              itemId: item.id,
              name: item.name,
              expiryDate: item.expiryDate,
              daysLeft,
            })
          }
        }
      }

      return reply.send({ lowStock, expiringSoon })
    }
  )
}
