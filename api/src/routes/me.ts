import { FastifyInstance } from 'fastify'
import { db } from '../db'
import { users, userPreferences } from '../db/schema'
import { eq } from 'drizzle-orm'

export async function registerMeRoutes(app: FastifyInstance) {
  app.get('/me', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user.sub

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

    return reply.send({
      user: {
        id: row.id,
        email: row.email,
        displayName: row.displayName,
        preferences: {
          themeMode: row.themeMode ?? 'amoled',
          accentColor: row.accentColor ?? '#00FFFF',
        },
      },
    })
  })
}
