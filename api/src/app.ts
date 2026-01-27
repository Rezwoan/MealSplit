import fastify, { FastifyReply, FastifyRequest } from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import { registerHealthRoutes } from './routes/health'
import { registerAuthRoutes } from './routes/auth'
import { registerMeRoutes } from './routes/me'
import { registerRoomRoutes } from './routes/rooms'
import { registerInviteRoutes } from './routes/invites'
import { registerBreakPeriodRoutes } from './routes/break-periods'
import { registerPurchaseRoutes } from './routes/purchases'
import { registerBalanceRoutes } from './routes/balances'
import { inventoryRoutes } from './routes/inventory'

export function buildApp() {
  const app = fastify({ logger: true })

  app.register(cors, {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type'],
  })

  app.register(jwt, {
    secret: process.env.JWT_SECRET ?? 'dev-secret',
  })

  app.register(multipart)

  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      return reply.code(401).send({ message: 'Unauthorized' })
    }
  })

  // Root route
  app.get('/', async (_request, reply) => {
    return reply.send({
      ok: true,
      name: 'MealSplit API',
      health: '/health',
      docs: 'https://github.com/Rezwoan/MealSplit',
    })
  })

  app.register(registerHealthRoutes)
  app.register(registerAuthRoutes)
  app.register(registerMeRoutes)
  app.register(registerRoomRoutes)
  app.register(registerInviteRoutes)
  app.register(registerBreakPeriodRoutes)
  app.register(registerPurchaseRoutes)
  app.register(registerBalanceRoutes)
  app.register(inventoryRoutes)

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error)
    reply.code(500).send({ message: 'Internal server error' })
  })

  return app
}
