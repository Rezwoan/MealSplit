import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { randomBytes, randomUUID } from 'crypto'
import { and, eq } from 'drizzle-orm'
import { db } from '../db'
import { roomInvites, roomMemberships } from '../db/schema'
import { countActiveMembers, requireRoomAdmin, requireRoomMember } from '../lib/room-guards'

const createInviteSchema = z.object({
  inviteeEmail: z.string().email().max(255).optional(),
  expiresInDays: z.number().int().min(1).max(30).optional(),
})

const confirmSchema = z.object({
  side: z.enum(['inviter', 'invitee']),
  confirm: z.boolean(),
})

function generateCode() {
  return randomBytes(16).toString('base64url')
}

export async function registerInviteRoutes(app: FastifyInstance) {
  app.post('/rooms/:roomId/invites', { preHandler: [app.authenticate] }, async (request, reply) => {
    const parsed = createInviteSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid request', issues: parsed.error.flatten() })
    }

    const { roomId } = request.params as { roomId: string }
    const userId = request.user.sub

    const admin = await requireRoomAdmin(roomId, userId)
    if (!admin) {
      return reply.code(403).send({ message: 'Not allowed' })
    }

    const code = generateCode()
    const expiresAt = parsed.data.expiresInDays
      ? new Date(Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000)
      : null

    const inviteId = randomUUID()

    await db.insert(roomInvites).values({
      id: inviteId,
      roomId,
      code,
      inviterUserId: userId,
      inviteeEmail: parsed.data.inviteeEmail ?? null,
      expiresAt,
      status: 'active',
    })

    return reply.send({ invite: { code, expiresAt } })
  })

  app.post('/invites/:code/accept', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user.sub
    const { code } = request.params as { code: string }

    const inviteResult = await db
      .select()
      .from(roomInvites)
      .where(eq(roomInvites.code, code))
      .limit(1)

    const invite = inviteResult[0]
    if (!invite) {
      return reply.code(404).send({ message: 'Invite not found' })
    }

    if (invite.status !== 'active') {
      return reply.code(400).send({ message: 'Invite not active' })
    }

    if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
      await db
        .update(roomInvites)
        .set({ status: 'expired' })
        .where(eq(roomInvites.id, invite.id))
      return reply.code(400).send({ message: 'Invite expired' })
    }

    const activeCount = await countActiveMembers(invite.roomId)
    if (activeCount >= 4) {
      return reply.code(400).send({ message: 'Room is full' })
    }

    const existing = await requireRoomMember(invite.roomId, userId)
    if (existing) {
      await db
        .update(roomMemberships)
        .set({
          status: 'pending',
          inviterConfirmed: 0,
          inviteeConfirmed: 0,
          leftAt: null,
        })
        .where(eq(roomMemberships.id, existing.id))
    } else {
      await db.insert(roomMemberships).values({
        id: randomUUID(),
        roomId: invite.roomId,
        userId,
        role: 'member',
        status: 'pending',
        inviterConfirmed: 0,
        inviteeConfirmed: 0,
      })
    }

    await db
      .update(roomInvites)
      .set({ status: 'accepted' })
      .where(eq(roomInvites.id, invite.id))

    return reply.send({ roomId: invite.roomId, membershipStatus: 'pending' })
  })

  app.post(
    '/rooms/:roomId/members/:memberId/confirm',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = confirmSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ message: 'Invalid request', issues: parsed.error.flatten() })
      }

      const { roomId, memberId } = request.params as { roomId: string; memberId: string }
      const userId = request.user.sub

      const membershipResult = await db
        .select()
        .from(roomMemberships)
        .where(eq(roomMemberships.id, memberId))
        .limit(1)

      const membership = membershipResult[0]
      if (!membership || membership.roomId !== roomId) {
        return reply.code(404).send({ message: 'Membership not found' })
      }

      if (parsed.data.side === 'inviter') {
        const admin = await requireRoomAdmin(roomId, userId)
        if (!admin) {
          return reply.code(403).send({ message: 'Not allowed' })
        }
      }

      if (parsed.data.side === 'invitee' && membership.userId !== userId) {
        return reply.code(403).send({ message: 'Not allowed' })
      }

      if (!parsed.data.confirm) {
        await db
          .update(roomMemberships)
          .set({ status: 'rejected' })
          .where(eq(roomMemberships.id, memberId))

        const updated = await db
          .select()
          .from(roomMemberships)
          .where(eq(roomMemberships.id, memberId))
          .limit(1)

        return reply.send({ membership: updated[0] })
      }

      if (parsed.data.side === 'inviter') {
        await db
          .update(roomMemberships)
          .set({ inviterConfirmed: 1 })
          .where(eq(roomMemberships.id, memberId))
      } else {
        await db
          .update(roomMemberships)
          .set({ inviteeConfirmed: 1 })
          .where(eq(roomMemberships.id, memberId))
      }

      const updated = await db
        .select()
        .from(roomMemberships)
        .where(eq(roomMemberships.id, memberId))
        .limit(1)

      const current = updated[0]
      if (current.inviterConfirmed && current.inviteeConfirmed && current.status !== 'active') {
        // Check room capacity before activating membership
        const activeCount = await countActiveMembers(roomId)
        if (activeCount >= 4) {
          return reply.code(409).send({ message: 'Room is full (max 4 active members).' })
        }

        await db
          .update(roomMemberships)
          .set({ status: 'active', joinedAt: new Date() })
          .where(eq(roomMemberships.id, memberId))
      }

      const final = await db
        .select()
        .from(roomMemberships)
        .where(eq(roomMemberships.id, memberId))
        .limit(1)

      return reply.send({ membership: final[0] })
    },
  )

  app.post(
    '/rooms/:roomId/members/:memberId/reject',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { roomId, memberId } = request.params as { roomId: string; memberId: string }
      const userId = request.user.sub

      const membershipResult = await db
        .select()
        .from(roomMemberships)
        .where(eq(roomMemberships.id, memberId))
        .limit(1)

      const membership = membershipResult[0]
      if (!membership || membership.roomId !== roomId) {
        return reply.code(404).send({ message: 'Membership not found' })
      }

      // Only admin/owner or the invitee can reject
      const admin = await requireRoomAdmin(roomId, userId)
      const isInvitee = membership.userId === userId

      if (!admin && !isInvitee) {
        return reply.code(403).send({ message: 'Not allowed' })
      }

      await db
        .update(roomMemberships)
        .set({ status: 'rejected' })
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
