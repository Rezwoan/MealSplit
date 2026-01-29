import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { and, eq, ne, sql } from 'drizzle-orm'
import { db } from '../db'
import { roomMemberships, rooms, users, userPreferences } from '../db/schema'
import { requireRoomAdmin, requireRoomMember } from '../lib/room-guards'

const createRoomSchema = z.object({
  name: z.string().min(1).max(120),
  currency: z.string().min(1).max(10).optional(),
})

export async function registerRoomRoutes(app: FastifyInstance) {
  app.post('/rooms', { preHandler: [app.authenticate] }, async (request, reply) => {
    const parsed = createRoomSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid request', issues: parsed.error.flatten() })
    }

    const userId = request.user.sub
    const roomId = randomUUID()
    const membershipId = randomUUID()

    const { name, currency } = parsed.data

    await db.insert(rooms).values({
      id: roomId,
      name,
      currency: currency ?? 'USD',
      ownerUserId: userId,
    })

    await db.insert(roomMemberships).values({
      id: membershipId,
      roomId,
      userId,
      role: 'owner',
      status: 'active',
      inviterConfirmed: 1,
      inviteeConfirmed: 1,
      joinedAt: new Date(),
    })

    const room = await db
      .select()
      .from(rooms)
      .where(eq(rooms.id, roomId))
      .limit(1)

    return reply.send({ room: room[0] })
  })

  app.get('/rooms', { preHandler: [app.authenticate] }, async (request) => {
    const userId = request.user.sub

    const result = await db
      .select({
        id: rooms.id,
        name: rooms.name,
        currency: rooms.currency,
        ownerUserId: rooms.ownerUserId,
        createdAt: rooms.createdAt,
        membershipStatus: roomMemberships.status,
        membershipRole: roomMemberships.role,
      })
      .from(rooms)
      .innerJoin(roomMemberships, eq(roomMemberships.roomId, rooms.id))
      .where(and(eq(roomMemberships.userId, userId), ne(roomMemberships.status, 'left')))

    return { rooms: result }
  })

  app.get('/rooms/:roomId', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user.sub
    const roomId = request.params as { roomId: string }

    const membership = await requireRoomMember(roomId.roomId, userId)
    if (!membership || membership.status === 'left' || membership.status === 'rejected') {
      return reply.code(403).send({ message: 'Not a room member' })
    }

    const roomResult = await db
      .select()
      .from(rooms)
      .where(eq(rooms.id, roomId.roomId))
      .limit(1)

    const members = await db
      .select({
        id: roomMemberships.id,
        userId: roomMemberships.userId,
        displayName: users.displayName,
        email: users.email,
        role: roomMemberships.role,
        status: roomMemberships.status,
        inviterConfirmed: roomMemberships.inviterConfirmed,
        inviteeConfirmed: roomMemberships.inviteeConfirmed,
        accentColor: userPreferences.accentColor,
        themeMode: userPreferences.themeMode,
      })
      .from(roomMemberships)
      .innerJoin(users, eq(users.id, roomMemberships.userId))
      .leftJoin(userPreferences, eq(userPreferences.userId, roomMemberships.userId))
      .where(eq(roomMemberships.roomId, roomId.roomId))

    return reply.send({ room: roomResult[0], members })
  })

  app.post('/rooms/:roomId/leave', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user.sub
    const { roomId } = request.params as { roomId: string }

    const membership = await requireRoomMember(roomId, userId)
    if (!membership || membership.status === 'left') {
      return reply.code(404).send({ message: 'Membership not found' })
    }

    if (membership.role === 'owner' && membership.status === 'active') {
      const owners = await db
        .select({ id: roomMemberships.id })
        .from(roomMemberships)
        .where(
          and(
            eq(roomMemberships.roomId, roomId),
            eq(roomMemberships.role, 'owner'),
            eq(roomMemberships.status, 'active'),
          ),
        )
      if (owners.length <= 1) {
        return reply.code(400).send({ message: 'Owner cannot leave without transferring ownership' })
      }
    }

    await db
      .update(roomMemberships)
      .set({ status: 'left', leftAt: new Date() })
      .where(eq(roomMemberships.id, membership.id))

    return reply.send({ ok: true })
  })

  app.delete(
    '/rooms/:roomId/members/:memberId',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const userId = request.user.sub
      const { roomId, memberId } = request.params as { roomId: string; memberId: string }

      const admin = await requireRoomAdmin(roomId, userId)
      if (!admin) {
        return reply.code(403).send({ message: 'Not allowed' })
      }

      const membershipResult = await db
        .select()
        .from(roomMemberships)
        .where(eq(roomMemberships.id, memberId))
        .limit(1)

      const membership = membershipResult[0]
      if (!membership || membership.roomId !== roomId) {
        return reply.code(404).send({ message: 'Membership not found' })
      }

      if (membership.role === 'owner') {
        return reply
          .code(400)
          .send({ message: 'Cannot remove owner without transferring ownership' })
      }

      await db
        .update(roomMemberships)
        .set({ status: 'left', leftAt: new Date() })
        .where(eq(roomMemberships.id, memberId))

      return reply.send({ ok: true })
    },
  )

  const updateRoleSchema = z.object({
    role: z.enum(['admin', 'member']),
  })

  app.patch(
    '/rooms/:roomId/members/:memberId/role',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = updateRoleSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ message: 'Invalid request', issues: parsed.error.flatten() })
      }

      const userId = request.user.sub
      const { roomId, memberId } = request.params as { roomId: string; memberId: string }

      const requesterMembership = await requireRoomMember(roomId, userId)
      if (!requesterMembership || requesterMembership.role !== 'owner') {
        return reply.code(403).send({ message: 'Only owner can change roles' })
      }

      const membershipResult = await db
        .select()
        .from(roomMemberships)
        .where(eq(roomMemberships.id, memberId))
        .limit(1)

      const membership = membershipResult[0]
      if (!membership || membership.roomId !== roomId) {
        return reply.code(404).send({ message: 'Membership not found' })
      }

      if (membership.role === 'owner') {
        return reply.code(400).send({ message: 'Cannot change owner role' })
      }

      await db
        .update(roomMemberships)
        .set({ role: parsed.data.role })
        .where(eq(roomMemberships.id, memberId))

      const updated = await db
        .select()
        .from(roomMemberships)
        .where(eq(roomMemberships.id, memberId))
        .limit(1)

      return reply.send({ membership: updated[0] })
    },
  )
}
