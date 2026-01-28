import { FastifyInstance } from 'fastify'
import { db } from '../db'
import { users, userPreferences, purchases, purchaseSplits, settlements } from '../db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { z } from 'zod'
import { ensureUserPreferences, checkSchema } from '../db/schema-check'

export async function registerMeRoutes(app: FastifyInstance) {
  app.get('/me', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user.sub

    try {
      // Check schema compatibility first
      const schemaCheck = await checkSchema()
      if (!schemaCheck.ok) {
        return reply.code(500).send({
          code: 'DB_SCHEMA_MISMATCH',
          message: 'Database schema is incomplete or outdated',
          details: 'Required tables or columns are missing.',
          missing: schemaCheck.missing,
          migrationHints: schemaCheck.migrationHints.length > 0
            ? schemaCheck.migrationHints
            : ['Run: npm run db:bootstrap'],
        })
      }

      const result = await db
        .select({
          id: users.id,
          email: users.email,
          displayName: users.displayName,
          themeMode: userPreferences.themeMode,
          accentColor: userPreferences.accentColor,
        })
        .from(users)
        .leftJoin(userPreferences, eq(userPreferences.userId, users.id))
        .where(eq(users.id, userId))
        .limit(1)

      const row = result[0]
      if (!row) {
        return reply.code(404).send({ message: 'User not found' })
      }

      // Auto-create preferences if missing
      if (row.themeMode === null || row.accentColor === null) {
        await ensureUserPreferences(userId)
      }

      return reply.send({
        user: {
          id: row.id,
          email: row.email,
          displayName: row.displayName,
          preferences: {
            themeMode: row.themeMode ?? 'dark',
            accentColor: row.accentColor ?? '#3B82F6',
          },
        },
      })
    } catch (err: any) {
      app.log.error('Error in GET /me:', err)
      return reply.code(500).send({
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch user profile',
        details: err.message,
      })
    }
  })

  // Update user profile
  const updateProfileSchema = z.object({
    displayName: z.string().min(1).max(100).optional(),
  })

  app.patch('/me', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user.sub
    const parsed = updateProfileSchema.safeParse(request.body)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid request', errors: parsed.error.issues })
    }

    const updates: any = {}
    if (parsed.data.displayName !== undefined) updates.displayName = parsed.data.displayName

    if (Object.keys(updates).length === 0) {
      return reply.code(400).send({ message: 'No fields to update' })
    }

    await db.update(users).set(updates).where(eq(users.id, userId))

    const result = await db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    return reply.send({ user: result[0] })
  })

  // Get user preferences
  app.get('/me/preferences', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user.sub

    const result = await db
      .select({
        themeMode: userPreferences.themeMode,
        accentHue: userPreferences.accentHue,
      })
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1)

    const prefs = result[0] ?? { themeMode: 'dark', accentHue: 190 }

    return reply.send({
      preferences: {
        themeMode: prefs.themeMode,
        accentHue: prefs.accentHue,
      },
    })
  })

  // Update user preferences
  const updatePreferencesSchema = z.object({
    themeMode: z.enum(['light', 'dark', 'amoled']).optional(),
    accentHue: z.number().int().min(0).max(360).optional(),
  })

  app.patch('/me/preferences', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user.sub
    const parsed = updatePreferencesSchema.safeParse(request.body)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid request', errors: parsed.error.issues })
    }

    const updates: any = {}
    if (parsed.data.themeMode !== undefined) updates.themeMode = parsed.data.themeMode
    if (parsed.data.accentHue !== undefined) updates.accentHue = parsed.data.accentHue

    if (Object.keys(updates).length === 0) {
      return reply.code(400).send({ message: 'No fields to update' })
    }

    // Check if preferences exist
    const existing = await db
      .select({ userId: userPreferences.userId })
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1)

    if (existing.length === 0) {
      // Create default preferences
      await db.insert(userPreferences).values({
        userId,
        themeMode: parsed.data.themeMode ?? 'dark',
        accentHue: parsed.data.accentHue ?? 190,
      })
    } else {
      await db.update(userPreferences).set(updates).where(eq(userPreferences.userId, userId))
    }

    const result = await db
      .select({
        themeMode: userPreferences.themeMode,
        accentHue: userPreferences.accentHue,
      })
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1)

    return reply.send({ preferences: result[0] })
  })

  // Get user stats
  app.get('/me/stats', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user.sub

    // Get total purchases paid by user
    const totalPaidResult = await db
      .select({
        count: sql<number>`COUNT(*)`,
        total: sql<number>`COALESCE(SUM(${purchases.totalAmountCents}), 0)`,
      })
      .from(purchases)
      .where(eq(purchases.payerUserId, userId))

    // Get total share across all purchases
    const totalShareResult = await db
      .select({
        total: sql<number>`COALESCE(SUM(${purchaseSplits.shareAmountCents}), 0)`,
      })
      .from(purchaseSplits)
      .where(eq(purchaseSplits.userId, userId))

    // Get settlements where user received money
    const settlementsReceivedResult = await db
      .select({
        total: sql<number>`COALESCE(SUM(${settlements.amountCents}), 0)`,
      })
      .from(settlements)
      .where(eq(settlements.toUserId, userId))

    // Get settlements where user paid money
    const settlementsPaidResult = await db
      .select({
        total: sql<number>`COALESCE(SUM(${settlements.amountCents}), 0)`,
      })
      .from(settlements)
      .where(eq(settlements.fromUserId, userId))

    // Get last 30 days stats
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const last30DaysResult = await db
      .select({
        count: sql<number>`COUNT(*)`,
        total: sql<number>`COALESCE(SUM(${purchases.totalAmountCents}), 0)`,
      })
      .from(purchases)
      .where(
        and(
          eq(purchases.payerUserId, userId),
          sql`${purchases.purchasedAt} >= ${thirtyDaysAgo.toISOString()}`,
        ),
      )

    // Count active rooms
    const roomsCountResult = await db.execute(
      sql`
        SELECT COUNT(DISTINCT room_id) as count
        FROM room_memberships
        WHERE user_id = ${userId} AND status = 'active'
      `,
    )

    const totalPaid = Number(totalPaidResult[0]?.total ?? 0)
    const totalShare = Number(totalShareResult[0]?.total ?? 0)
    const settlementsReceived = Number(settlementsReceivedResult[0]?.total ?? 0)
    const settlementsPaid = Number(settlementsPaidResult[0]?.total ?? 0)

    // Net = what I paid - what I owe + what I received - what I paid in settlements
    const netCents = totalPaid - totalShare + settlementsReceived - settlementsPaid

    return reply.send({
      stats: {
        roomsCount: Number((roomsCountResult as any)[0]?.count ?? 0),
        purchasesCount: Number(totalPaidResult[0]?.count ?? 0),
        totalPaidCents: totalPaid,
        totalShareCents: totalShare,
        netCents,
        last30Days: {
          purchasesCount: Number(last30DaysResult[0]?.count ?? 0),
          totalPaidCents: Number(last30DaysResult[0]?.total ?? 0),
        },
      },
    })
  })
}
