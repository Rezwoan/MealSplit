import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { and, eq } from 'drizzle-orm'
import { db } from '../db'
import {
  purchases,
  purchaseSplits,
  roomMemberships,
  rooms,
  settlements,
  users,
} from '../db/schema'
import { requireRoomMember } from '../lib/room-guards'
import { parseAmountToCents } from '../lib/money'

const createSettlementSchema = z.object({
  payerUserId: z.string().uuid(),
  receiverUserId: z.string().uuid(),
  amount: z.union([z.string(), z.number()]),
  settledAt: z.string().datetime().optional(),
})

export async function registerBalanceRoutes(app: FastifyInstance) {
  app.get(
    '/rooms/:roomId/balances',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { roomId } = request.params as { roomId: string }
      const userId = request.user.sub

      const membership = await requireRoomMember(roomId, userId)
      if (!membership || membership.status === 'left' || membership.status === 'rejected') {
        return reply.code(403).send({ message: 'Not allowed' })
      }

      const roomResult = await db
        .select({ currency: rooms.currency })
        .from(rooms)
        .where(eq(rooms.id, roomId))
        .limit(1)

      const currency = roomResult[0]?.currency ?? 'USD'

      const members = await db
        .select({
          userId: roomMemberships.userId,
          displayName: users.displayName,
          status: roomMemberships.status,
        })
        .from(roomMemberships)
        .innerJoin(users, eq(users.id, roomMemberships.userId))
        .where(eq(roomMemberships.roomId, roomId))

      const purchasesRows = await db
        .select({
          payerUserId: purchases.payerUserId,
          totalAmountCents: purchases.totalAmountCents,
        })
        .from(purchases)
        .where(eq(purchases.roomId, roomId))

      const splitRows = await db
        .select({
          userId: purchaseSplits.userId,
          shareAmountCents: purchaseSplits.shareAmountCents,
        })
        .from(purchaseSplits)
        .innerJoin(purchases, eq(purchases.id, purchaseSplits.purchaseId))
        .where(eq(purchases.roomId, roomId))

      const settlementRows = await db
        .select()
        .from(settlements)
        .where(eq(settlements.roomId, roomId))

      const paidMap = new Map<string, number>()
      purchasesRows.forEach((row) => {
        paidMap.set(row.payerUserId, (paidMap.get(row.payerUserId) ?? 0) + row.totalAmountCents)
      })

      const shareMap = new Map<string, number>()
      splitRows.forEach((row) => {
        shareMap.set(row.userId, (shareMap.get(row.userId) ?? 0) + row.shareAmountCents)
      })

      const netMap = new Map<string, number>()
      members.forEach((member) => {
        const paid = paidMap.get(member.userId) ?? 0
        const share = shareMap.get(member.userId) ?? 0
        netMap.set(member.userId, paid - share)
      })

      settlementRows.forEach((row) => {
        netMap.set(row.payerUserId, (netMap.get(row.payerUserId) ?? 0) + row.amountCents)
        netMap.set(row.receiverUserId, (netMap.get(row.receiverUserId) ?? 0) - row.amountCents)
      })

      const membersResponse = members.map((member) => {
        const paid = paidMap.get(member.userId) ?? 0
        const share = shareMap.get(member.userId) ?? 0
        const net = netMap.get(member.userId) ?? 0
        return {
          userId: member.userId,
          displayName: member.displayName,
          paidCents: paid,
          shareCents: share,
          netCents: net,
        }
      })

      const creditors = membersResponse
        .filter((m) => m.netCents > 0)
        .map((m) => ({ userId: m.userId, amount: m.netCents }))
      const debtors = membersResponse
        .filter((m) => m.netCents < 0)
        .map((m) => ({ userId: m.userId, amount: -m.netCents }))

      const suggestedTransfers: Array<{ fromUserId: string; toUserId: string; amountCents: number }> = []
      let i = 0
      let j = 0
      while (i < debtors.length && j < creditors.length) {
        const debtor = debtors[i]
        const creditor = creditors[j]
        const amount = Math.min(debtor.amount, creditor.amount)
        if (amount > 0) {
          suggestedTransfers.push({
            fromUserId: debtor.userId,
            toUserId: creditor.userId,
            amountCents: amount,
          })
          debtor.amount -= amount
          creditor.amount -= amount
        }
        if (debtor.amount === 0) i += 1
        if (creditor.amount === 0) j += 1
      }

      return reply.send({
        currency,
        members: membersResponse,
        settlements: settlementRows,
        suggestedTransfers,
      })
    },
  )

  app.post(
    '/rooms/:roomId/settlements',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = createSettlementSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ message: 'Invalid request', issues: parsed.error.flatten() })
      }

      const { roomId } = request.params as { roomId: string }
      const userId = request.user.sub

      const membership = await requireRoomMember(roomId, userId)
      if (!membership || membership.status === 'left' || membership.status === 'rejected') {
        return reply.code(403).send({ message: 'Not allowed' })
      }

      const { payerUserId, receiverUserId, amount, settledAt } = parsed.data

      const payerMember = await requireRoomMember(roomId, payerUserId)
      const receiverMember = await requireRoomMember(roomId, receiverUserId)
      if (!payerMember || payerMember.status !== 'active' || !receiverMember || receiverMember.status !== 'active') {
        return reply.code(400).send({ message: 'Both users must be active members' })
      }

      let amountCents: number
      try {
        amountCents = parseAmountToCents(amount)
      } catch (err) {
        return reply.code(400).send({ message: 'Invalid amount' })
      }

      if (amountCents <= 0) {
        return reply.code(400).send({ message: 'Amount must be greater than zero' })
      }

      const settlementId = randomUUID()
      const settledTime = settledAt ? new Date(settledAt) : new Date()

      await db.insert(settlements).values({
        id: settlementId,
        roomId,
        payerUserId,
        receiverUserId,
        amountCents,
        settledAt: settledTime,
      })

      const created = await db
        .select()
        .from(settlements)
        .where(eq(settlements.id, settlementId))
        .limit(1)

      return reply.send({ settlement: created[0] })
    },
  )

  app.get(
    '/rooms/:roomId/settlements',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { roomId } = request.params as { roomId: string }
      const userId = request.user.sub

      const membership = await requireRoomMember(roomId, userId)
      if (!membership || membership.status === 'left' || membership.status === 'rejected') {
        return reply.code(403).send({ message: 'Not allowed' })
      }

      const rows = await db.select().from(settlements).where(eq(settlements.roomId, roomId))

      return reply.send({ settlements: rows })
    },
  )
}
