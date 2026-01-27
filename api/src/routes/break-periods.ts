import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { and, eq } from 'drizzle-orm'
import { db } from '../db'
import { memberBreakPeriods, roomMemberships } from '../db/schema'
import { requireRoomAdmin, requireRoomMember } from '../lib/room-guards'

const breakPeriodSchema = z.object({
  userId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function registerBreakPeriodRoutes(app: FastifyInstance) {
  app.post(
    '/rooms/:roomId/break-periods',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = breakPeriodSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ message: 'Invalid request', issues: parsed.error.flatten() })
      }

      const { roomId } = request.params as { roomId: string }
      const userId = request.user.sub
      const { userId: targetUserId, startDate, endDate } = parsed.data

      const isAdmin = await requireRoomAdmin(roomId, userId)
      if (targetUserId !== userId && !isAdmin) {
        return reply.code(403).send({ message: 'Not allowed' })
      }

      if (startDate > endDate) {
        return reply.code(400).send({ message: 'startDate must be before endDate' })
      }

      const membership = await requireRoomMember(roomId, targetUserId)
      if (!membership || membership.status !== 'active') {
        return reply.code(400).send({ message: 'User must be an active room member' })
      }

      const breakId = randomUUID()

      await db.insert(memberBreakPeriods).values({
        id: breakId,
        roomId,
        userId: targetUserId,
        startDate,
        endDate,
        mode: 'exclude',
      })

      const created = await db
        .select()
        .from(memberBreakPeriods)
        .where(eq(memberBreakPeriods.id, breakId))
        .limit(1)

      return reply.send({ breakPeriod: created[0] })
    },
  )

  app.get(
    '/rooms/:roomId/break-periods',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { roomId } = request.params as { roomId: string }
      const userId = request.user.sub

      const membership = await requireRoomMember(roomId, userId)
      if (!membership || membership.status === 'left' || membership.status === 'rejected') {
        return reply.code(403).send({ message: 'Not allowed' })
      }

      const rows = await db
        .select()
        .from(memberBreakPeriods)
        .where(eq(memberBreakPeriods.roomId, roomId))

      return reply.send({ breakPeriods: rows })
    },
  )

  app.delete(
    '/rooms/:roomId/break-periods/:id',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { roomId, id } = request.params as { roomId: string; id: string }
      const userId = request.user.sub

      const row = await db
        .select()
        .from(memberBreakPeriods)
        .where(and(eq(memberBreakPeriods.roomId, roomId), eq(memberBreakPeriods.id, id)))
        .limit(1)

      const breakPeriod = row[0]
      if (!breakPeriod) {
        return reply.code(404).send({ message: 'Break period not found' })
      }

      const isAdmin = await requireRoomAdmin(roomId, userId)
      if (breakPeriod.userId !== userId && !isAdmin) {
        return reply.code(403).send({ message: 'Not allowed' })
      }

      await db.delete(memberBreakPeriods).where(eq(memberBreakPeriods.id, id))

      return reply.send({ ok: true })
    },
  )
}
