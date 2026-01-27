import fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import { registerHealthRoutes } from './routes/health'
import { registerAuthRoutes } from './routes/auth'
import { registerMeRoutes } from './routes/me'

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

  app.decorate('authenticate', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      return reply.code(401).send({ message: 'Unauthorized' })
    }
  })

  app.register(registerHealthRoutes)
  app.register(registerAuthRoutes)
  app.register(registerMeRoutes)

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error)
    reply.code(500).send({ message: 'Internal server error' })
  })

  return app
}
