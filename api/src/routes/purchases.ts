import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { and, eq } from 'drizzle-orm'
import { db } from '../db'
import {
  memberBreakPeriods,
  purchaseSplitInputs,
  purchaseSplits,
  purchases,
  roomMemberships,
  rooms,
  users,
} from '../db/schema'
import { requireRoomMember } from '../lib/room-guards'
import { computeEqualSplitCents, computeCustomAmountSplit, computeCustomPercentSplit } from '../lib/split'
import { parseAmountToCents } from '../lib/money'

const createPurchaseSchema = z.object({
  totalAmount: z.union([z.string(), z.number()]),
  payerUserId: z.string().uuid(),
  purchasedAt: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
  category: z.string().max(50).optional(),
  splitMode: z.enum(['equal', 'custom_amount', 'custom_percent']).optional(),
  splitInputs: z.array(z.object({
    userId: z.string().uuid(),
    value: z.string(),
  })).optional(),
})

const listQuerySchema = z.object({
  limit: z.string().optional(),
  offset: z.string().optional(),
})

function toDate(value: string | undefined) {
  return value ? new Date(value) : new Date()
}

export async function registerPurchaseRoutes(app: FastifyInstance) {
  app.post(
    '/rooms/:roomId/purchases',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = createPurchaseSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ message: 'Invalid request', issues: parsed.error.flatten() })
      }

      const { roomId } = request.params as { roomId: string }
      const userId = request.user.sub

      const membership = await requireRoomMember(roomId, userId)
      if (!membership || membership.status === 'left' || membership.status === 'rejected') {
        return reply.code(403).send({ message: 'Not allowed' })
      }

      const { totalAmount, payerUserId, purchasedAt, notes, category, splitMode, splitInputs } = parsed.data

      const payerMembership = await requireRoomMember(roomId, payerUserId)
      if (!payerMembership || payerMembership.status !== 'active') {
        return reply.code(400).send({ message: 'Payer must be an active member' })
      }

      let totalCents: number
      try {
        totalCents = parseAmountToCents(totalAmount)
      } catch (err) {
        return reply.code(400).send({ message: 'Invalid amount' })
      }

      if (totalCents <= 0) {
        return reply.code(400).send({ message: 'Amount must be greater than zero' })
      }

      const purchaseTime = toDate(purchasedAt)

      const roomResult = await db
        .select({ currency: rooms.currency })
        .from(rooms)
        .where(eq(rooms.id, roomId))
        .limit(1)

      const room = roomResult[0]
      if (!room) {
        return reply.code(404).send({ message: 'Room not found' })
      }

      const activeMembers = await db
        .select({ userId: roomMemberships.userId })
        .from(roomMemberships)
        .where(and(eq(roomMemberships.roomId, roomId), eq(roomMemberships.status, 'active')))

      const breakPeriods = await db
        .select()
        .from(memberBreakPeriods)
        .where(eq(memberBreakPeriods.roomId, roomId))

      const purchaseDate = purchaseTime.toISOString().slice(0, 10)
      const excluded = new Set(
        breakPeriods
          .filter(
            (period) =>
              period.mode === 'exclude' &&
              period.startDate <= purchaseDate &&
              period.endDate >= purchaseDate,
          )
          .map((period) => period.userId),
      )

      const memberIds = activeMembers
        .map((row) => row.userId)
        .filter((id) => !excluded.has(id))

      // Compute split based on mode
      const mode = splitMode || 'equal'
      let splitMap: Record<string, number>
      let inputsMap: Record<string, number> | undefined

      try {
        if (mode === 'equal') {
          splitMap = computeEqualSplitCents({
            totalCents,
            memberIdsActiveForPurchase: memberIds,
            payerId: payerUserId,
          })
        } else if (mode === 'custom_amount') {
          if (!splitInputs || splitInputs.length === 0) {
            return reply.code(400).send({ message: 'Custom amount split requires splitInputs' })
          }

          const customAmounts: Record<string, number> = {}
          splitInputs.forEach(input => {
            try {
              customAmounts[input.userId] = parseAmountToCents(input.value)
            } catch {
              throw new Error(`Invalid amount for user ${input.userId}`)
            }
          })

          splitMap = computeCustomAmountSplit({
            totalCents,
            memberIdsActiveForPurchase: memberIds,
            customAmounts,
          })
          inputsMap = customAmounts
        } else if (mode === 'custom_percent') {
          if (!splitInputs || splitInputs.length === 0) {
            return reply.code(400).send({ message: 'Custom percent split requires splitInputs' })
          }

          const customPercents: Record<string, number> = {}
          splitInputs.forEach(input => {
            const percent = parseFloat(input.value)
            if (isNaN(percent) || percent < 0 || percent > 100) {
              throw new Error(`Invalid percentage for user ${input.userId}`)
            }
            // Convert to basis points (25.5% => 2550)
            customPercents[input.userId] = Math.round(percent * 100)
          })

          splitMap = computeCustomPercentSplit({
            totalCents,
            memberIdsActiveForPurchase: memberIds,
            customPercents,
          })
          inputsMap = customPercents
        } else {
          return reply.code(400).send({ message: 'Invalid split mode' })
        }
      } catch (err: any) {
        return reply.code(400).send({ message: err.message || 'Split calculation failed' })
      }

      const purchaseId = randomUUID()

      const created = await db.transaction(async (tx) => {
        await tx.insert(purchases).values({
          id: purchaseId,
          roomId,
          payerUserId,
          totalAmountCents: totalCents,
          currency: room.currency,
          notes: notes ?? null,
          category: category ?? null,
          splitMode: mode,
          purchasedAt: purchaseTime,
        })

        // Store custom split inputs if applicable
        if (inputsMap) {
          const inputRows = Object.entries(inputsMap).map(([userId, value]) => ({
            id: randomUUID(),
            purchaseId,
            userId,
            inputValue: value,
          }))
          await tx.insert(purchaseSplitInputs).values(inputRows)
        }

        const splitRows = Object.entries(splitMap).map(([userId, share]) => ({
          id: randomUUID(),
          purchaseId,
          userId,
          shareAmountCents: share,
        }))

        await tx.insert(purchaseSplits).values(splitRows)

        return splitRows
      })

      const purchase = await db
        .select()
        .from(purchases)
        .where(eq(purchases.id, purchaseId))
        .limit(1)

      return reply.send({ purchase: purchase[0], splits: created })
    },
  )

  app.get(
    '/rooms/:roomId/purchases',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { roomId } = request.params as { roomId: string }
      const userId = request.user.sub

      const membership = await requireRoomMember(roomId, userId)
      if (!membership || membership.status === 'left' || membership.status === 'rejected') {
        return reply.code(403).send({ message: 'Not allowed' })
      }

      const query = listQuerySchema.safeParse(request.query)
      const limit = query.success && query.data.limit ? Number(query.data.limit) : 50
      const offset = query.success && query.data.offset ? Number(query.data.offset) : 0

      const rows = await db
        .select({
          id: purchases.id,
          roomId: purchases.roomId,
          payerUserId: purchases.payerUserId,
          payerDisplayName: users.displayName,
          totalAmountCents: purchases.totalAmountCents,
          currency: purchases.currency,
          notes: purchases.notes,
          category: purchases.category,
          splitMode: purchases.splitMode,
          purchasedAt: purchases.purchasedAt,
          createdAt: purchases.createdAt,
        })
        .from(purchases)
        .innerJoin(users, eq(users.id, purchases.payerUserId))
        .where(eq(purchases.roomId, roomId))
        .limit(limit)
        .offset(offset)

      return reply.send({ purchases: rows })
    },
  )

  app.get(
    '/rooms/:roomId/purchases/:purchaseId',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { roomId, purchaseId } = request.params as { roomId: string; purchaseId: string }
      const userId = request.user.sub

      const membership = await requireRoomMember(roomId, userId)
      if (!membership || membership.status === 'left' || membership.status === 'rejected') {
        return reply.code(403).send({ message: 'Not allowed' })
      }

      const purchaseResult = await db
        .select({
          id: purchases.id,
          roomId: purchases.roomId,
          payerUserId: purchases.payerUserId,
          payerDisplayName: users.displayName,
          totalAmountCents: purchases.totalAmountCents,
          currency: purchases.currency,
          notes: purchases.notes,
          category: purchases.category,
          splitMode: purchases.splitMode,
          purchasedAt: purchases.purchasedAt,
          createdAt: purchases.createdAt,
        })
        .from(purchases)
        .innerJoin(users, eq(users.id, purchases.payerUserId))
        .where(and(eq(purchases.roomId, roomId), eq(purchases.id, purchaseId)))
        .limit(1)

      const purchase = purchaseResult[0]
      if (!purchase) {
        return reply.code(404).send({ message: 'Purchase not found' })
      }

      const splits = await db
        .select({
          id: purchaseSplits.id,
          userId: purchaseSplits.userId,
          shareAmountCents: purchaseSplits.shareAmountCents,
          displayName: users.displayName,
        })
        .from(purchaseSplits)
        .innerJoin(users, eq(users.id, purchaseSplits.userId))
        .where(eq(purchaseSplits.purchaseId, purchaseId))

      // Fetch split inputs if custom split mode
      let splitInputs: Array<{ userId: string; inputValue: number }> | undefined
      if (purchase.splitMode === 'custom_amount' || purchase.splitMode === 'custom_percent') {
        splitInputs = await db
          .select({
            userId: purchaseSplitInputs.userId,
            inputValue: purchaseSplitInputs.inputValue,
          })
          .from(purchaseSplitInputs)
          .where(eq(purchaseSplitInputs.purchaseId, purchaseId))
      }

      return reply.send({ purchase, splits, splitInputs })
    },
  )
}
