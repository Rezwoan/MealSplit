import { and, eq, inArray } from 'drizzle-orm'
import { db } from '../db'
import { roomMemberships } from '../db/schema'

export async function requireRoomMember(roomId: string, userId: string) {
  const result = await db
    .select()
    .from(roomMemberships)
    .where(and(eq(roomMemberships.roomId, roomId), eq(roomMemberships.userId, userId)))
    .limit(1)

  return result[0] ?? null
}

export async function requireRoomAdmin(roomId: string, userId: string) {
  const membership = await requireRoomMember(roomId, userId)
  if (!membership) {
    return null
  }
  if (membership.status === 'left' || membership.status === 'rejected') {
    return null
  }
  if (membership.role === 'owner' || membership.role === 'admin') {
    return membership
  }
  return null
}

export async function countActiveMembers(roomId: string) {
  const rows = await db
    .select({ id: roomMemberships.id })
    .from(roomMemberships)
    .where(
      and(
        eq(roomMemberships.roomId, roomId),
        inArray(roomMemberships.status, ['active']),
      ),
    )
  return rows.length
}
