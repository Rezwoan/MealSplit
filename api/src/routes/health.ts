import { FastifyInstance } from 'fastify'
import { pool } from '../db/connection'

export async function registerHealthRoutes(app: FastifyInstance) {
  app.get('/health', async () => {
    return { ok: true, name: 'MealSplit API' }
  })

  app.get('/health/db', async (_request, reply) => {
    try {
      // Temporary: just test DB connection without schema check
      const conn = await pool.getConnection()
      conn.release()
      return reply.send({ ok: true, message: 'Database connection OK' })
    } catch (err: any) {
      return reply.code(500).send({
        ok: false,
        code: 'DB_CONNECTION_ERROR',
        message: 'Failed to connect to database',
        details: err.message,
      })
    }
  })
}
